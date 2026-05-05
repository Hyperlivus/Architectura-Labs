import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServerError } from '../../providers/errors';

const mockMessageCommands: any = {
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockMessageQueries: any = {
  getById: jest.fn(),
  getByChat: jest.fn(),
};

const mockMemberService: any = {
  getByUserAndChat: jest.fn(),
  hasPermission: jest.fn(),
};

const mockRateLimiter: any = {
  onMessageCreated: jest.fn(async (..._args: any[]) => {}),
};

const mockEventBus: any = {
  publish: jest.fn(async (..._args: any[]) => {}),
};

jest.mock('../../modules/message/dal', () => ({
  __esModule: true,
  messageCommands: mockMessageCommands,
  messageQueries: mockMessageQueries,
}));

jest.mock('../../modules/member/service', () => ({
  __esModule: true,
  default: mockMemberService,
}));

jest.mock('../../providers/db', () => ({
  __esModule: true,
  default: {
    withTransaction: <R>(fn: () => Promise<R>) => fn(),
  },
}));

jest.mock('../../side-effects/rate-limit/db-message-rate-limiter', () => ({
  messageRateLimiter: mockRateLimiter,
}));

jest.mock('../../side-effects/events/in-process-event-bus', () => ({
  appEventBus: mockEventBus,
}));

describe('message service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
  });

  it('createMessage throws for non-member', async () => {
    mockMemberService.getByUserAndChat.mockResolvedValue(null);
    const service = (await import('../../modules/message/service')).default;

    await expect(service.createMessage({ chatId: 1, userId: 10, content: 'Hello' })).rejects.toBeInstanceOf(ServerError);
  });

  it('createMessage calls rate limiter and publishes event', async () => {
    mockMemberService.getByUserAndChat.mockResolvedValue({ id: 33, banned: false });
    mockMessageCommands.create.mockResolvedValue({
      id: 77,
      chatId: 1,
      userId: 10,
      content: 'Hello @alice',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const service = (await import('../../modules/message/service')).default;

    await service.createMessage({ chatId: 1, userId: 10, content: 'Hello @alice' });
    await new Promise<void>((resolve) => setImmediate(() => resolve()));

    expect(mockRateLimiter.onMessageCreated).toHaveBeenCalledWith({ userId: 10, chatId: 1, messageId: 77 });
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish.mock.calls[0][0]).toMatchObject({
      type: 'MessageWasCreated',
      payload: {
        messageId: 77,
        chatId: 1,
        authorUserId: 10,
      },
    });
  });

  it('updateMessage throws when message missing', async () => {
    mockMessageQueries.getById.mockResolvedValue(null);
    const service = (await import('../../modules/message/service')).default;

    await expect(service.updateMessage(999, 1, { content: 'edit' })).rejects.toBeInstanceOf(ServerError);
  });

  it('deleteMessage allows owner', async () => {
    mockMessageQueries.getById.mockResolvedValue({ id: 8, chatId: 7, userId: 3 });
    mockMessageCommands.delete.mockResolvedValue(true);

    const service = (await import('../../modules/message/service')).default;
    await expect(service.deleteMessage(8, 3, 7)).resolves.toBe(true);
  });
});
