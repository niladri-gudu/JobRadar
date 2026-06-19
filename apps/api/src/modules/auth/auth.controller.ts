import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth';
import { config } from '../../config';

export class AuthController {
  private authService = new AuthService();

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, name } = request.body as any;
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    try {
      const result = await this.authService.signUp({
        email,
        password,
        name: name || undefined,
      });

      reply.status(result.status);
      result.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      const bodyText = await result.text();
      let data;
      try {
        data = JSON.parse(bodyText);
      } catch {
        data = bodyText;
      }
      return reply.send(data);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({ error: error.message || 'Registration failed' });
    }
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as any;
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    try {
      const result = await this.authService.signIn({
        email,
        password,
      });

      reply.status(result.status);
      result.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      const bodyText = await result.text();
      let data;
      try {
        data = JSON.parse(bodyText);
      } catch {
        data = bodyText;
      }
      return reply.send(data);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({ error: error.message || 'Login failed' });
    }
  };

  handleAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const url = new URL(request.url, config.apiUrl);
    const headers = fromNodeHeaders(request.headers);
    
    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });
    
    const response = await auth.handler(req);
    
    reply.status(response.status);
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });
    
    return reply.send(response.body ? await response.text() : null);
  };
}
