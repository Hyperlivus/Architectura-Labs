import { FastifyInstance } from 'fastify';
import { registerRealtimeSocket } from '../side-effects/notifications/realtime-hub';

export async function realtimeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/realtime', { websocket: true }, (connection) => {
    registerRealtimeSocket(connection.socket);
  });
}
