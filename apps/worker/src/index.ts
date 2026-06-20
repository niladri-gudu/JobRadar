import { config } from './config';
import { discoveryWorker } from './queue';
import { setupScheduler } from './scheduler';
import { db } from '@repo/database';

async function run() {
  console.log('--- JobRadar Worker Initializing ---');
  console.log(`Environment: ${config.env}`);
  console.log(`Redis Host: ${config.redis.host}:${config.redis.port}`);
  console.log(`AI Model: ${config.ai.model}`);
  console.log(`Headless Browser: ${config.browser.headless}`);

  // Test database connection on startup
  try {
    const companyCount = await db.company.count();
    console.log(`[DB] PostgreSQL connected. Current company count: ${companyCount}`);
  } catch (dbErr) {
    console.error('[DB] Failed to connect to PostgreSQL:', dbErr);
    process.exit(1);
  }

  // Initialize BullMQ Workers
  console.log(`[Queue] Initializing worker on queue: ${discoveryWorker.name}...`);
  await discoveryWorker.waitUntilReady();
  console.log('[Queue] Worker is ready and listening for jobs.');

  // Initialize Cron Scheduler
  await setupScheduler();

  console.log('--- JobRadar Worker Initialized ---');
}

run().catch((err) => {
  console.error('Failed to run worker:', err);
  process.exit(1);
});
