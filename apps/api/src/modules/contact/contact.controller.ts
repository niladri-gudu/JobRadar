import { FastifyRequest, FastifyReply } from 'fastify';
import { ContactService } from './contact.service';

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
}
