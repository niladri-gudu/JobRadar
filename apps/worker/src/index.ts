import { config } from './config';

async function run() {
  console.log('--- JobRadar Worker Initializing ---');
  console.log(`Environment: ${config.env}`);
  console.log(`Redis Host: ${config.redis.host}:${config.redis.port}`);
  console.log(`AI Model: ${config.ai.model}`);
  console.log(`Headless Browser: ${config.browser.headless}`);
  console.log('Worker is listening for queue jobs...');
}

run().catch((err) => {
  console.error('Failed to run worker:', err);
  process.exit(1);
});
