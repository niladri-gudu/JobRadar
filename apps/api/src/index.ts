import Fastify from 'fastify';
import { config } from './config';

const fastify = Fastify({
  logger: true,
});

fastify.get('/health', async () => {
  return {
    status: 'ok',
    environment: config.env,
    port: config.port,
    redisHost: config.redis.host,
    aiModel: config.ai.model,
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`API Server is running on port ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
