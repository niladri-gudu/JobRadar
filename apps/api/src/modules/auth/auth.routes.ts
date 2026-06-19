import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';

export async function authRoutes(fastify: FastifyInstance) {
  const controller = new AuthController();

  fastify.post('/auth/register', controller.register);
  fastify.post('/auth/login', controller.login);
  fastify.all('/api/auth/*', controller.handleAuth);
}
