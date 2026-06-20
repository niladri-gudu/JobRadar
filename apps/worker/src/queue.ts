import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import { db } from '@repo/database';
import { config } from './config';
import { crawlYcCompanies } from './crawler/yc.crawler';
import { crawlProductHuntCompanies } from './crawler/ph.crawler';
import { crawlWellfoundCompanies } from './crawler/wf.crawler';
import { crawlRemoteCoCompanies } from './crawler/remoteco.crawler';
import { crawlRemoteOkCompanies } from './crawler/remoteok.crawler';
import { crawlWeWorkRemotelyCompanies } from './crawler/weworkremotely.crawler';
import { crawlCutshortCompanies } from './crawler/cutshort.crawler';
import { crawlFounditCompanies } from './crawler/foundit.crawler';
import { crawlLinkedinCompanies } from './crawler/linkedin.crawler';
import { crawlNaukriCompanies } from './crawler/naukri.crawler';
import { crawlIndeedCompanies } from './crawler/indeed.crawler';
import { normalizeDomain, validateWebsite } from './crawler/validation.worker';
import { runCareerIntelligence } from './crawler/discovery';

// Redis connection options
export const redisConnection: ConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
};

export const DISCOVERY_QUEUE_NAME = 'company-discovery';

export enum DiscoverySource {
  YC = 'YC',
  PRODUCT_HUNT = 'PRODUCT_HUNT',
  WELLFOUND = 'WELLFOUND',
  REMOTE_CO = 'REMOTE_CO',
  REMOTE_OK = 'REMOTE_OK',
  WE_WORK_REMOTELY = 'WE_WORK_REMOTELY',
  CUTSHORT = 'CUTSHORT',
  FOUNDIT = 'FOUNDIT',
  LINKEDIN = 'LINKEDIN',
  NAUKRI = 'NAUKRI',
  INDEED = 'INDEED',
}

export interface DiscoveryJobPayload {
  source: DiscoverySource;
}

// Initialize Discovery Queue
export const discoveryQueue = new Queue(DISCOVERY_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * Worker handler to process discovery jobs
 */
export const discoveryWorker = new Worker(
  DISCOVERY_QUEUE_NAME,
  async (job: Job<any>) => {
    const { source, companyId, action } = job.data;

    if (action === 'REFRESH_ALL_JOBS') {
      console.log(`[Worker] Cron trigger: Distributing career intelligence crawls for all validated companies...`);
      try {
        const companies = await db.company.findMany({
          where: { status: 'VALIDATED' },
          select: { id: true, name: true },
        });

        console.log(`[Worker] Enqueuing jobs for ${companies.length} companies...`);
        for (const company of companies) {
          await discoveryQueue.add(
            `cron-ci-${company.id}-${Date.now()}`,
            { companyId: company.id }
          );
        }
        return { status: 'success', enqueuedCount: companies.length };
      } catch (err: any) {
        console.error(`[Worker] Job refresh distribution failed:`, err.message || err);
        throw err;
      }
    }

    if (companyId) {
      console.log(`[Worker] Starting career intelligence job ${job.id} for company ID: ${companyId}`);
      try {
        const result = await runCareerIntelligence(companyId);
        return {
          status: 'success',
          source: 'CAREER_INTELLIGENCE',
          companiesFound: 0,
          companiesAdded: 0,
          duplicates: 0,
          failures: 0,
          ...result
        };
      } catch (ciErr: any) {
        console.error(`[Worker] Career intelligence job failed for company ID ${companyId}:`, ciErr.message || ciErr);
        throw ciErr;
      }
    }

    console.log(`[Worker] Starting discovery job ${job.id} for source: ${source}`);

    // Create DiscoveryRun record
    const run = await db.discoveryRun.create({
      data: {
        source,
        companiesFound: 0,
        companiesAdded: 0,
        duplicates: 0,
        failures: 0,
        startedAt: new Date(),
      },
    });

    let companiesFound = 0;
    let companiesAdded = 0;
    let duplicates = 0;
    let failures = 0;

    try {
      // 1. Crawl source
      let crawledCompanies: Array<{ name: string; website: string; industry?: string; source: string }> = [];

      switch (source) {
        case DiscoverySource.YC:
          crawledCompanies = await crawlYcCompanies();
          break;
        case DiscoverySource.PRODUCT_HUNT:
          crawledCompanies = await crawlProductHuntCompanies();
          break;
        case DiscoverySource.WELLFOUND:
          crawledCompanies = await crawlWellfoundCompanies();
          break;
        case DiscoverySource.REMOTE_CO:
          crawledCompanies = await crawlRemoteCoCompanies();
          break;
        case DiscoverySource.REMOTE_OK:
          crawledCompanies = await crawlRemoteOkCompanies();
          break;
        case DiscoverySource.WE_WORK_REMOTELY:
          crawledCompanies = await crawlWeWorkRemotelyCompanies();
          break;
        case DiscoverySource.CUTSHORT:
          crawledCompanies = await crawlCutshortCompanies();
          break;
        case DiscoverySource.FOUNDIT:
          crawledCompanies = await crawlFounditCompanies();
          break;
        case DiscoverySource.LINKEDIN:
          crawledCompanies = await crawlLinkedinCompanies();
          break;
        case DiscoverySource.NAUKRI:
          crawledCompanies = await crawlNaukriCompanies();
          break;
        case DiscoverySource.INDEED:
          crawledCompanies = await crawlIndeedCompanies();
          break;
        default:
          throw new Error(`Unsupported discovery source: ${source}`);
      }

      companiesFound = crawledCompanies.length;
      console.log(`[Worker] Discovered ${companiesFound} raw companies from ${source}. Processing validation & deduplication...`);

      // 2. Process companies (deduplication & validation)
      // Process in batches/concurrently with a limit to avoid overwhelming resources
      const batchSize = 25;
      for (let i = 0; i < crawledCompanies.length; i += batchSize) {
        const batch = crawledCompanies.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (company) => {
            try {
              const domain = normalizeDomain(company.website);
              if (!domain) {
                failures++;
                return;
              }

              // Check deduplication (normalizedDomain must be unique)
              const existing = await db.company.findUnique({
                where: { normalizedDomain: domain },
              });

              if (existing) {
                duplicates++;
                return;
              }

              // Validate website
              const isValid = await validateWebsite(company.website);
              if (!isValid) {
                failures++;
                // Optionally insert as REJECTED to log/remember it
                await db.company.create({
                  data: {
                    name: company.name,
                    website: company.website,
                    normalizedDomain: domain,
                    industry: company.industry || null,
                    source: company.source,
                    status: 'REJECTED',
                  },
                });
                return;
              }

              // Save to database
              const createdCompany = await db.company.create({
                data: {
                  name: company.name,
                  website: company.website,
                  normalizedDomain: domain,
                  industry: company.industry || null,
                  source: company.source,
                  status: 'VALIDATED',
                },
              });

              companiesAdded++;

              // Execute Career Intelligence Discovery immediately for the company
              try {
                await runCareerIntelligence(createdCompany.id);
              } catch (ciErr) {
                console.error(`[Worker] Career intelligence discovery failed for ${company.name}:`, ciErr);
              }
            } catch (itemErr) {
              console.error(`[Worker] Error processing company ${company.name}:`, itemErr);
              failures++;
            }
          })
        );

        // Update discovery run in database incrementally so we can see progress
        await db.discoveryRun.update({
          where: { id: run.id },
          data: {
            companiesFound,
            companiesAdded,
            duplicates,
            failures,
          },
        });
      }

      console.log(`[Worker] Discovery job ${job.id} completed. Added: ${companiesAdded}, Duplicates: ${duplicates}, Failures: ${failures}`);

      // Update final status
      return await db.discoveryRun.update({
        where: { id: run.id },
        data: {
          companiesFound,
          companiesAdded,
          duplicates,
          failures,
          completedAt: new Date(),
        },
      });
    } catch (err: any) {
      console.error(`[Worker] Discovery job ${job.id} failed:`, err);
      
      // Update run status with failures
      await db.discoveryRun.update({
        where: { id: run.id },
        data: {
          companiesFound,
          companiesAdded,
          duplicates,
          failures: failures || companiesFound, // If we couldn't even crawl, count all as failures
          completedAt: new Date(),
        },
      });

      throw err;
    }
  },
  { connection: redisConnection, concurrency: 1 }
);
