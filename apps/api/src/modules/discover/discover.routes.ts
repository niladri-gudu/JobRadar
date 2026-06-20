import { FastifyInstance } from 'fastify';
import { handleDiscover } from './discover.controller';

export async function discoverRoutes(fastify: FastifyInstance) {
  fastify.post('/discover', handleDiscover);
}
