import { FastifyRequest, FastifyReply } from 'fastify';
import * as jobService from './job.service';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth';

export async function handleGetJobs(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      remoteOnly?: string;
      minScore?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const page = request.query.page ? parseInt(request.query.page, 10) : 1;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
    const search = request.query.search;
    const remoteOnly = request.query.remoteOnly === 'true';
    const minScore = request.query.minScore ? parseInt(request.query.minScore, 10) : undefined;

    // Get user session to retrieve parsed resume
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    const userId = session?.user?.id;

    const data = await jobService.getJobs({
      page,
      limit,
      search,
      remoteOnly,
      minScore,
      userId,
    });

    return reply.status(200).send(data);
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      error: 'Failed to retrieve jobs',
      message: err.message,
    });
  }
}

export async function handleGetJobById(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const job = await jobService.getJobById(id);

    if (!job) {
      return reply.status(404).send({
        error: 'Job not found',
        message: `No job found with ID: ${id}`,
      });
    }

    return reply.status(200).send(job);
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      error: 'Failed to retrieve job details',
      message: err.message,
    });
  }
}
