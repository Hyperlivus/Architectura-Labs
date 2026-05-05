import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSubscribe: any = jest.fn();
const mockGetByTags: any = jest.fn();
const mockSendMail: any = jest.fn(async () => {});
const mockBroadcastRealtime: any = jest.fn();

jest.mock('../../side-effects/events/in-process-event-bus', () => ({
  __esModule: true,
  appEventBus: {
    subscribe: mockSubscribe,
  },
}));

jest.mock('../../modules/user/dal', () => ({
  __esModule: true,
  userQueries: {
    getByTags: mockGetByTags,
  },
}));

jest.mock('../../providers/mailer', () => ({
  __esModule: true,
  default: {
    sendMail: mockSendMail,
  },
}));

jest.mock('../../side-effects/notifications/realtime-hub', () => ({
  __esModule: true,
  broadcastRealtime: mockBroadcastRealtime,
}));

describe('message notification broadcaster', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes and sends realtime plus mention emails', async () => {
    const { registerMessageNotificationBroadcaster } = await import('../../side-effects/notifications/message-notification-broadcaster');
    registerMessageNotificationBroadcaster();

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledWith('MessageWasCreated', expect.any(Function));

    const handler = mockSubscribe.mock.calls[0][1] as (event: any) => Promise<void>;
    mockGetByTags.mockResolvedValue([
      { id: 2, tag: 'alice', email: 'alice@example.com' },
      { id: 3, tag: 'bob', email: 'bob@example.com' },
      { id: 1, tag: 'author', email: 'author@example.com' },
    ]);

    await handler({
      type: 'MessageWasCreated',
      occurredAt: '2026-01-01T00:00:00.000Z',
      payload: {
        messageId: 1,
        chatId: 10,
        authorUserId: 1,
        content: 'hello @alice and @bob',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });

    expect(mockBroadcastRealtime).toHaveBeenCalledTimes(1);
    expect(mockGetByTags).toHaveBeenCalledWith(['alice', 'bob']);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });

  it('does not query users when message has no mentions', async () => {
    const { registerMessageNotificationBroadcaster } = await import('../../side-effects/notifications/message-notification-broadcaster');
    registerMessageNotificationBroadcaster();
    const handler = mockSubscribe.mock.calls[0][1] as (event: any) => Promise<void>;

    await handler({
      type: 'MessageWasCreated',
      occurredAt: '2026-01-01T00:00:00.000Z',
      payload: {
        messageId: 1,
        chatId: 10,
        authorUserId: 1,
        content: 'plain message',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });

    expect(mockBroadcastRealtime).toHaveBeenCalledTimes(1);
    expect(mockGetByTags).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
