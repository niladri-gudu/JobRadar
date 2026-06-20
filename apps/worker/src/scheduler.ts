import { discoveryQueue, DiscoverySource } from './queue';

/**
 * Sets up repeatable daily discovery jobs at 9:00 AM
 */
export async function setupScheduler() {
  console.log('[Scheduler] Configuring repeatable daily discovery jobs...');

  try {
    // 1. Remove existing repeatable jobs to avoid duplicates on restart
    const repeatableJobs = await discoveryQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await discoveryQueue.removeRepeatableByKey(job.key);
    }

    // 2. Add repeatable jobs for YC, Product Hunt, and Wellfound at 9:00 AM daily
    // Pattern: '0 9 * * *' (Minute Hour DayOfMonth Month DayOfWeek)
    await discoveryQueue.add(
      'discover-yc',
      { source: DiscoverySource.YC },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover YC (9:00 AM daily)');

    await discoveryQueue.add(
      'discover-product-hunt',
      { source: DiscoverySource.PRODUCT_HUNT },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover Product Hunt (9:00 AM daily)');

    await discoveryQueue.add(
      'discover-wellfound',
      { source: DiscoverySource.WELLFOUND },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover Wellfound (9:00 AM daily)');

    // 3. Add repeatable job to refresh all existing company jobs daily at 10:00 AM
    await discoveryQueue.add(
      'refresh-all-jobs',
      { action: 'REFRESH_ALL_JOBS' },
      {
        repeat: {
          pattern: '0 10 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Refresh All Jobs (10:00 AM daily)');

  } catch (err) {
    console.error('[Scheduler] Failed to setup repeatable jobs:', err);
  }
}
