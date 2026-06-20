import { FastifyRequest, FastifyReply } from 'fastify';
import { ContactService } from './contact.service';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth';

export class ContactController {
  private contactService = new ContactService();

  getJobContacts = async (
    request: FastifyRequest<{
      Params: {
        id: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const contacts = await this.contactService.getJobContacts(id);
      return reply.status(200).send({ contacts });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Failed to retrieve job contacts',
        message: err.message,
      });
    }
  };

  getOutreach = async (
    request: FastifyRequest<{
      Params: {
        id: string;
        contactId: string;
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

      const { id: jobId, contactId } = request.params;
      const templates = await this.contactService.getOutreachTemplates(jobId, contactId);
      return reply.status(200).send({ templates });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Failed to retrieve outreach templates',
        message: err.message,
      });
    }
  };

  generateOutreach = async (
    request: FastifyRequest<{
      Params: {
        id: string;
        contactId: string;
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

      const { id: jobId, contactId } = request.params;
      const templates = await this.contactService.generateOutreachTemplates(
        session.user.id,
        jobId,
        contactId
      );
      return reply.status(200).send({ templates });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        error: 'Failed to generate outreach templates',
        message: err.message,
      });
    }
  };
}
