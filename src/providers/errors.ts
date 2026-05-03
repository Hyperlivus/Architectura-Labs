export enum ServerErrorCode {
  NOT_FOUND = 404,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  CONFLICT = 409,
  INTERNAL_ERROR = 500,
}

export class ServerError extends Error {
  public readonly code: ServerErrorCode;
  public readonly status: number;

  constructor(code: ServerErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

export function throwServerError({ code, message, status = 400 }: { code: ServerErrorCode; message: string; status?: number }): never {
  throw new ServerError(code, message, status);
}

import { ZodError } from 'zod';

export function errorHandler(error: any, request: any, reply: any) {
  if (error instanceof ServerError) {
    return reply.status(error.status).send({ code: error.code, message: error.message });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      code: ServerErrorCode.BAD_REQUEST,
      message: 'Validation failed',
      details: error.issues,
    });
  }

  return reply.status(500).send({ code: ServerErrorCode.INTERNAL_ERROR, message: 'Internal Server Error' });
}
