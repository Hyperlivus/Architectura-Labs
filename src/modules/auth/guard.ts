import { FastifyRequest } from 'fastify';
import userService from '../user/service';
import { throwServerError, ServerErrorCode } from '../../providers/errors';
import jwt from '../../services/jwt';

export interface AuthenticatedUser {
    id: number;
}

declare module 'fastify' {
    interface FastifyRequest {
        user?: AuthenticatedUser;
    }
}

export async function authGuard(request: FastifyRequest): Promise<AuthenticatedUser> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throwServerError({ code: ServerErrorCode.UNAUTHORIZED, message: 'Unauthorized', status: 401 });
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verifyToken(token) as AuthenticatedUser;
        const user = await userService.getById(decoded.id);
        if (!user) {
            throwServerError({ code: ServerErrorCode.UNAUTHORIZED, message: 'User not found', status: 401 });
        }
        request.user = decoded;
        return decoded;
    } catch {
        throwServerError({ code: ServerErrorCode.UNAUTHORIZED, message: 'Invalid token', status: 401 });
    }
}