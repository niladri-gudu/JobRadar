import { FastifyRequest, FastifyReply } from 'fastify';
import { ResumeService } from './resume.service';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth';
import '@fastify/multipart'; // for TypeScript declaration merging

export class ResumeController {
  private resumeService = new ResumeService();

  upload = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Check if it is a multipart request
      if (!request.isMultipart()) {
        return reply.status(400).send({ error: 'Request must be multipart/form-data' });
      }

      const fileData = await request.file();
      if (!fileData) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Check file extension / mimetype to make sure it is a PDF
      if (fileData.mimetype !== 'application/pdf' && !fileData.filename.toLowerCase().endsWith('.pdf')) {
        return reply.status(400).send({ error: 'Only PDF files are supported' });
      }

      const buffer = await fileData.toBuffer();
      const filename = fileData.filename;

      // 1. Parse text from PDF
      const parsedText = await this.resumeService.parsePdf(buffer);

      // 2. Save PDF file to filesystem
      const fileUrl = await this.resumeService.saveResumeFile(session.user.id, filename, buffer);

      // 3. Upsert DB record
      const resume = await this.resumeService.upsertResume(session.user.id, fileUrl, parsedText);

      return reply.status(200).send({
        message: 'Resume parsed and uploaded successfully',
        resume: {
          id: resume.id,
          fileUrl: resume.fileUrl,
          createdAt: resume.createdAt,
          parsedTextSnippet: parsedText.slice(0, 150) + (parsedText.length > 150 ? '...' : ''),
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to process resume' });
    }
  };

  getResume = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const resume = await this.resumeService.getResume(session.user.id);
      if (!resume) {
        return reply.status(404).send({ error: 'No resume found for this user' });
      }

      return reply.status(200).send({
        resume: {
          id: resume.id,
          fileUrl: resume.fileUrl,
          createdAt: resume.createdAt,
          parsedTextSnippet: resume.parsedText.slice(0, 150) + (resume.parsedText.length > 150 ? '...' : ''),
        },
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: error.message || 'Failed to retrieve resume' });
    }
  };
}
