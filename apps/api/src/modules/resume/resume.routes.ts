import { FastifyInstance } from 'fastify';
import { ResumeController } from './resume.controller';

export async function resumeRoutes(fastify: FastifyInstance) {
  const controller = new ResumeController();

  fastify.post('/resume/upload', controller.upload);
  fastify.get('/resume', controller.getResume);
}
