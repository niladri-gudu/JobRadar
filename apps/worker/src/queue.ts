import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import { db } from '@repo/database';
import { config } from './config';
import { crawlYcCompanies } from './crawler/yc.crawler';
import { crawlProductHuntCompanies } from './crawler/ph.crawler';
import { crawlWellfoundCompanies } from './crawler/wf.crawler';
import { normalizeDomain, validateWebsite } from './crawler/validation.worker';

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
  async (job: Job<DiscoveryJobPayload>) => {
    const { source } = job.data;
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
              await db.company.create({
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
