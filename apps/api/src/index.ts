import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { authRoutes } from './modules/auth/auth.routes';
import { resumeRoutes } from './modules/resume/resume.routes';
import { discoverRoutes } from './modules/discover/discover.routes';
import { companyRoutes } from './modules/company/company.routes';

const fastify = Fastify({
  logger: true,
});

// Ensure upload directory exists
const uploadResumesDir = path.join(process.cwd(), 'uploads', 'resumes');
if (!fs.existsSync(uploadResumesDir)) {
  fs.mkdirSync(uploadResumesDir, { recursive: true });
}

// Register CORS
fastify.register(cors, {
  origin: config.webUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
});

// Register Multipart support
fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Serve uploaded resumes statically
fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
  decorateReply: false, // Avoid collision if other plugins decorate reply with static
});

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    environment: config.env,
    port: config.port,
    redisHost: config.redis.host,
    aiModel: config.ai.model,
  };
});

// Register modular routes
fastify.register(authRoutes);
fastify.register(resumeRoutes);
fastify.register(discoverRoutes);
fastify.register(companyRoutes);

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
