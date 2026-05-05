const WS_OPEN = 1;

type MinimalWs = {
  readyState: number;
  send(data: string): void;
  once(event: 'close', listener: () => void): void;
};

const subscribers = new Set<MinimalWs>();

export function registerRealtimeSocket(socket: MinimalWs): void {
  subscribers.add(socket);
  socket.once('close', () => {
    subscribers.delete(socket);
  });
}

export function broadcastRealtime(payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const socket of subscribers) {
    if (socket.readyState === WS_OPEN) {
      socket.send(data);
    }
  }
}
