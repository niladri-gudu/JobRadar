import { FastifyInstance } from 'fastify';
import { handleGetJobs, handleGetJobById } from './job.controller';

export async function jobRoutes(fastify: FastifyInstance) {
  fastify.get('/jobs', handleGetJobs);
  fastify.get('/jobs/:id', handleGetJobById);
}
