import fastify from 'fastify';
import websocket from '@fastify/websocket';
import db from './providers/db';
import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chats';
import { errorHandler } from './providers/errors';
import { setupChatWebsocketRoutes } from './providers/websocket';


export async function buildApp() {
  const app = fastify({ logger: true });

  await db.connect();


  await app.register(websocket);
  setupChatWebsocketRoutes(app);

  app.setErrorHandler(errorHandler);

  app.get('/', async () => ({ status: 'ok', message: 'Chat API v1' }));

  await authRoutes(app);
  await chatRoutes(app);

  return app;
}
