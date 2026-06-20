import { FastifyRequest, FastifyReply } from 'fastify';
import * as companyService from './company.service';

export async function handleGetCompanies(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      source?: string;
      status?: 'PENDING' | 'VALIDATED' | 'REJECTED';
    };
  }>,
  reply: FastifyReply
) {
  try {
    const page = request.query.page ? parseInt(request.query.page, 10) : 1;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
    const { search, source, status } = request.query;

    const data = await companyService.getCompanies({
      page,
      limit,
      search,
      source,
      status,
    });

    return reply.status(200).send(data);
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      error: 'Failed to retrieve companies',
      message: err.message,
    });
  }
}

export async function handleGetCompanyStats(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const stats = await companyService.getCompanyStats();
    return reply.status(200).send(stats);
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      error: 'Failed to retrieve company statistics',
      message: err.message,
    });
  }
}

export async function handleCrawlCompanyUrl(
  request: FastifyRequest<{
    Body: {
      url: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { url } = request.body || {};
    if (!url) {
      return reply.status(400).send({
        error: 'Website URL is required',
      });
    }

    console.log(`[Company Controller] Starting manual URL crawling: ${url}`);
    const result = await companyService.discoverCompanyUrl(url);
    
    if (result.status === 'duplicate') {
      return reply.status(409).send(result);
    }

    if (result.status === 'failed_validation') {
      return reply.status(422).send(result);
    }

    return reply.status(200).send(result);
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      error: 'Failed to crawl company website URL',
      message: err.message,
    });
  }
}
export async function handleDeleteManualCompanies(request: FastifyRequest, reply: FastifyReply) {
  try {
    const result = await companyService.deleteManualCompanies();
    return reply.status(200).send(result);
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to delete manual companies', message: err.message });
  }
}
