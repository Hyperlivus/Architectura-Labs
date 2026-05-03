import { FastifyInstance } from 'fastify';

type ChatSocket = any;
const chatSubscriptions = new Map<number, Set<ChatSocket>>();

export function setupChatWebsocketRoutes(app: FastifyInstance) {
  app.get('/chats/:chatId/ws', { websocket: true }, (connection, request) => {
    const chatId = Number((request.params as any).chatId);
    if (!Number.isInteger(chatId)) {
      connection.socket.close();
      return;
    }

    let sockets = chatSubscriptions.get(chatId);
    if (!sockets) {
      sockets = new Set();
      chatSubscriptions.set(chatId, sockets);
    }

    sockets.add(connection.socket);
    connection.socket.on('close', () => {
      sockets?.delete(connection.socket);
      if (sockets && sockets.size === 0) {
        chatSubscriptions.delete(chatId);
      }
    });
  });
}

export function broadcastChatMessage(chatId: number, payload: unknown) {
  const sockets = chatSubscriptions.get(chatId);
  if (!sockets || sockets.size === 0) {
    return;
  }

  const message = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(message);
    }
  }
}
