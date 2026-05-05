import fastify from 'fastify';
import websocket from '@fastify/websocket';
import db from './providers/db';
import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chats';
import { realtimeRoutes } from './routes/realtime';
import { errorHandler } from './providers/errors';
import { registerSideEffectHandlers } from './side-effects/bootstrap';

export async function buildApp() {
  const app = fastify({ logger: true });

  await db.maybeOne('SELECT 1 AS ok');

  registerSideEffectHandlers();

  await app.register(websocket);

  app.setErrorHandler(errorHandler);

  app.get('/', async () => ({ status: 'ok', message: 'Chat API v1' }));

  await authRoutes(app);
  await chatRoutes(app);
  await realtimeRoutes(app);

  return app;
}
