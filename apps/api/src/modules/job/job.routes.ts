import { FastifyInstance } from 'fastify';
import { handleGetJobs, handleGetJobById } from './job.controller';
import { ContactController } from '../contact/contact.controller';

const contactController = new ContactController();

export async function jobRoutes(fastify: FastifyInstance) {
  fastify.get('/jobs', handleGetJobs);
  fastify.get('/jobs/:id', handleGetJobById);
  fastify.get('/jobs/:id/contacts', contactController.getJobContacts);
  fastify.get('/jobs/:id/contacts/:contactId/outreach', contactController.getOutreach);
  fastify.post('/jobs/:id/contacts/:contactId/outreach', contactController.generateOutreach);
}
