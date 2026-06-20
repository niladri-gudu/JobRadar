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

    await discoveryQueue.add(
      'discover-remoteco',
      { source: DiscoverySource.REMOTE_CO },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover Remote.co (9:00 AM daily)');

    await discoveryQueue.add(
      'discover-remoteok',
      { source: DiscoverySource.REMOTE_OK },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover RemoteOK (9:00 AM daily)');

    await discoveryQueue.add(
      'discover-weworkremotely',
      { source: DiscoverySource.WE_WORK_REMOTELY },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover WeWorkRemotely (9:00 AM daily)');

    await discoveryQueue.add(
      'discover-cutshort',
      { source: DiscoverySource.CUTSHORT },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover Cutshort (9:00 AM daily)');

    await discoveryQueue.add(
      'discover-foundit',
      { source: DiscoverySource.FOUNDIT },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover Foundit (9:00 AM daily)');

    await discoveryQueue.add(
      'discover-linkedin',
      { source: DiscoverySource.LINKEDIN },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover LinkedIn (9:00 AM daily)');

    await discoveryQueue.add(
      'discover-naukri',
      { source: DiscoverySource.NAUKRI },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover Naukri (9:00 AM daily)');

    await discoveryQueue.add(
      'discover-indeed',
      { source: DiscoverySource.INDEED },
      {
        repeat: {
          pattern: '0 9 * * *',
        },
      }
    );
    console.log('[Scheduler] Scheduled repeatable job: Discover Indeed (9:00 AM daily)');

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
