import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z, ZodTypeAny } from 'zod';
import authService from '../modules/auth/service';
import { loginScheme, registerScheme } from '../modules/auth/validation';
import { authGuard } from '../modules/auth/guard';
import { throwServerError, ServerErrorCode } from '../providers/errors';

const verifyOtpSchema = z.object({
  otp: z.string().length(6),
});

function parseRequest<T extends ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throwServerError({
      code: ServerErrorCode.BAD_REQUEST,
      message: 'Invalid request payload',
      status: 400,
    });
  }

  return result.data;
}

export async function authRoutes(app: FastifyInstance) {
    app.post('/auth/login', async (request, reply) => {
        const data = parseRequest(loginScheme, request.body);
        const result = await authService.login(data);
        reply.send(result);
    });

    app.post('/auth/register', async (request, reply) => {
        const data = parseRequest(registerScheme, request.body);
        const result = await authService.register(data);
        reply.send(result);
    });

    app.get('/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
        const authUser = await authGuard(request);
        const user = await authService.getUserById(authUser.id);
        reply.send({ user });
    });

    app.post('/auth/request-otp', async (request, reply) => {
        const authUser = await authGuard(request);
        const otp = await authService.requestOtp(authUser.id);
        reply.send({ otp });
    });

    app.post('/auth/verify-otp', async (request, reply) => {
        const authUser = await authGuard(request);
        const { otp } = parseRequest(verifyOtpSchema, request.body);
        const user = await authService.verifyOtp(authUser.id, otp);
        reply.send({ user });
    });
}