import { FastifyRequest, FastifyReply } from 'fastify';
import { ApplicationService } from './application.service';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth';

export class ApplicationController {
  private appService = new ApplicationService();

  getApplications = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const applications = await this.appService.getApplications(session.user.id);
      return reply.status(200).send({ applications });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Failed to retrieve applications',
        message: err.message,
      });
    }
  };

  createApplication = async (
    request: FastifyRequest<{
      Body: {
        jobId: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { jobId } = request.body;
      if (!jobId) {
        return reply.status(400).send({ error: 'Missing jobId in request body' });
      }

      const application = await this.appService.createApplication(session.user.id, jobId);
      return reply.status(201).send({ application });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Failed to track application',
        message: err.message,
      });
    }
  };

  updateApplication = async (
    request: FastifyRequest<{
      Params: {
        id: string;
      };
      Body: {
        status?: string;
        notes?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      const { status, notes } = request.body;

      const application = await this.appService.updateApplication(session.user.id, id, {
        status,
        notes,
      });
      return reply.status(200).send({ application });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Failed to update application',
        message: err.message,
      });
    }
  };

  deleteApplication = async (
    request: FastifyRequest<{
      Params: {
        id: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;
      await this.appService.deleteApplication(session.user.id, id);
      return reply.status(200).send({ success: true, message: 'Application deleted' });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Failed to delete application',
        message: err.message,
      });
    }
  };
}
