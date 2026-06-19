import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fromNodeHeaders } from 'better-auth/node';
import { config } from './config';
import { auth } from './lib/auth';

const fastify = Fastify({
  logger: true,
});

// Register CORS
fastify.register(cors, {
  origin: config.webUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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

// Custom register endpoint to satisfy PRD
fastify.post('/auth/register', async (request, reply) => {
  const { email, password, name } = request.body as any;
  if (!email || !password) {
    return reply.status(400).send({ error: 'Email and password are required' });
  }

  try {
    const result = await auth.api.signUpEmail({
      body: { email, password, name: name || undefined },
      asResponse: true,
    });

    reply.status(result.status);
    result.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    const bodyText = await result.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch {
      data = bodyText;
    }
    return reply.send(data);
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(400).send({ error: error.message || 'Registration failed' });
  }
});

// Custom login endpoint to satisfy PRD
fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body as any;
  if (!email || !password) {
    return reply.status(400).send({ error: 'Email and password are required' });
  }

  try {
    const result = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    reply.status(result.status);
    result.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    const bodyText = await result.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch {
      data = bodyText;
    }
    return reply.send(data);
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(400).send({ error: error.message || 'Login failed' });
  }
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
