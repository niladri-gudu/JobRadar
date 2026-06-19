import Fastify from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { config } from './config';
import { auth } from './lib/auth';

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

// Better Auth catch-all route handler
fastify.all('/api/auth/*', async (request, reply) => {
  const url = new URL(request.url, config.apiUrl);
  const headers = fromNodeHeaders(request.headers);
  
  const req = new Request(url.toString(), {
    method: request.method,
    headers,
    body: request.body ? JSON.stringify(request.body) : undefined,
  });
  
  const response = await auth.handler(req);
  
  reply.status(response.status);
  response.headers.forEach((value, key) => {
    reply.header(key, value);
  });
  
  return reply.send(response.body ? await response.text() : null);
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
