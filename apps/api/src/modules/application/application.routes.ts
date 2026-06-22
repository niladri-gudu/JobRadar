import { FastifyInstance } from 'fastify';
import { ApplicationController } from './application.controller';

const appController = new ApplicationController();

export async function applicationRoutes(fastify: FastifyInstance) {
  fastify.get('/applications', appController.getApplications);
  fastify.post('/applications', appController.createApplication);
  fastify.patch('/applications/:id', appController.updateApplication);
  fastify.delete('/applications/:id', appController.deleteApplication);
}
