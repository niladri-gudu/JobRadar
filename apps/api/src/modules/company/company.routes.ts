import { FastifyInstance } from 'fastify';
import {
  handleGetCompanies,
  handleGetCompanyStats,
  handleCrawlCompanyUrl,
  handleDeleteManualCompanies,
} from './company.controller';

export async function companyRoutes(fastify: FastifyInstance) {
  fastify.get('/companies', handleGetCompanies);
  fastify.get('/companies/stats', handleGetCompanyStats);
  fastify.post('/companies/crawl', handleCrawlCompanyUrl);
  fastify.delete('/companies/manual', handleDeleteManualCompanies);
}
