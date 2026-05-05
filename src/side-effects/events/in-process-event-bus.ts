import type { AppDomainEvent } from './domain-events';

type Handler<E extends AppDomainEvent> = (event: E) => void | Promise<void>;

export class InProcessEventBus {
  private readonly handlers = new Map<string, Set<Handler<AppDomainEvent>>>();

  subscribe<E extends AppDomainEvent>(eventType: E['type'], handler: Handler<E>): void {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler as Handler<AppDomainEvent>);
  }

  async publish(event: AppDomainEvent): Promise<void> {
    const set = this.handlers.get(event.type);
    if (!set) {
      return;
    }
    for (const handler of set) {
      try {
        await handler(event);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[event-bus] handler failed', event.type, err);
      }
    }
  }
}

export const appEventBus = new InProcessEventBus();
