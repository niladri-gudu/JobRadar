import { Queue, QueueEvents, ConnectionOptions } from 'bullmq';
import { config } from '../../config';

const redisConnection: ConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
};

const DISCOVERY_QUEUE_NAME = 'company-discovery';

export const discoveryQueue = new Queue(DISCOVERY_QUEUE_NAME, {
  connection: redisConnection,
});

export const queueEvents = new QueueEvents(DISCOVERY_QUEUE_NAME, {
  connection: redisConnection,
});

export interface DiscoveryMetrics {
  source: string;
  companiesFound: number;
  companiesAdded: number;
  duplicates: number;
  failures: number;
}

/**
 * Triggers a discovery job for a single source on the queue and awaits its results.
 */
export type DiscoverySourceType = 'YC' | 'PRODUCT_HUNT' | 'WELLFOUND' | 'REMOTE_CO' | 'REMOTE_OK' | 'WE_WORK_REMOTELY' | 'CUTSHORT' | 'FOUNDIT' | 'LINKEDIN' | 'NAUKRI' | 'INDEED';

export async function runSourceDiscovery(source: DiscoverySourceType): Promise<DiscoveryMetrics> {
  console.log(`[API Service] Adding job to queue for: ${source}`);
  
  const job = await discoveryQueue.add(
    `discover-${source.toLowerCase()}-${Date.now()}`,
    { source }
  );

  console.log(`[API Service] Job queued with ID: ${job.id}. Waiting for worker...`);

  // Wait for the job to complete or fail
  // We set a generous 10-minute timeout for Playwright browser scraping fallback
  const result: any = await Promise.race([
    job.waitUntilFinished(queueEvents),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Discovery job for ${source} timed out after 10 minutes.`)), 600000))
  ]);

  if (!result) {
    throw new Error(`Job completed but returned no results for source ${source}`);
  }

  return {
    source: result.source,
    companiesFound: result.companiesFound || 0,
    companiesAdded: result.companiesAdded || 0,
    duplicates: result.duplicates || 0,
    failures: result.failures || 0,
  };
}

/**
 * Runs discovery across specified sources (or all if empty) and aggregates results.
 */
export async function runDiscovery(source?: DiscoverySourceType): Promise<{
  companiesFound: number;
  companiesAdded: number;
  duplicates: number;
  failures: number;
  runs: DiscoveryMetrics[];
}> {
  const sourcesToRun = source 
    ? [source] 
    : (['YC', 'PRODUCT_HUNT', 'WELLFOUND', 'REMOTE_CO', 'REMOTE_OK', 'WE_WORK_REMOTELY', 'CUTSHORT', 'FOUNDIT', 'LINKEDIN', 'NAUKRI', 'INDEED'] as const);
  
  console.log(`[API Service] Starting discovery run for: ${sourcesToRun.join(', ')}`);

  // Run in parallel
  const results = await Promise.all(
    sourcesToRun.map(async (src) => {
      try {
        return await runSourceDiscovery(src);
      } catch (err) {
        console.error(`[API Service] Run failed for source ${src}:`, err);
        return {
          source: src,
          companiesFound: 0,
          companiesAdded: 0,
          duplicates: 0,
          failures: 0,
        };
      }
    })
  );

  // Aggregate metrics
  let totalFound = 0;
  let totalAdded = 0;
  let totalDuplicates = 0;
  let totalFailures = 0;

  for (const r of results) {
    totalFound += r.companiesFound;
    totalAdded += r.companiesAdded;
    totalDuplicates += r.duplicates;
    totalFailures += r.failures;
  }

  return {
    companiesFound: totalFound,
    companiesAdded: totalAdded,
    duplicates: totalDuplicates,
    failures: totalFailures,
    runs: results,
  };
}
