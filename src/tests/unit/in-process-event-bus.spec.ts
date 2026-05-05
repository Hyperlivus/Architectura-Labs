import { describe, expect, it, jest } from '@jest/globals';
import { InProcessEventBus } from '../../side-effects/events/in-process-event-bus';
import type { MessageWasCreatedEvent } from '../../side-effects/events/domain-events';

function sampleEvent(): MessageWasCreatedEvent {
  return {
    type: 'MessageWasCreated',
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: {
      messageId: 1,
      chatId: 1,
      authorUserId: 1,
      content: 'hello',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  };
}

describe('InProcessEventBus', () => {
  it('calls subscribed handler on publish', async () => {
    const bus = new InProcessEventBus();
    const handler = jest.fn(async () => {});
    bus.subscribe('MessageWasCreated', handler);

    await bus.publish(sampleEvent());
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('continues executing handlers when one fails', async () => {
    const bus = new InProcessEventBus();
    const okHandler = jest.fn(async () => {});
    bus.subscribe('MessageWasCreated', async () => {
      throw new Error('boom');
    });
    bus.subscribe('MessageWasCreated', okHandler);

    await expect(bus.publish(sampleEvent())).resolves.toBeUndefined();
    expect(okHandler).toHaveBeenCalledTimes(1);
  });
});
