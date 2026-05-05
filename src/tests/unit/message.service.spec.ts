import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServerError } from '../../providers/errors';

const mockMessageCommands = {
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockMessageQueries = {
  getById: jest.fn(),
  getByChat: jest.fn(),
};

const mockMemberService = {
  getByUserAndChat: jest.fn(),
  hasPermission: jest.fn(),
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
  messageRateLimiter: {
    onMessageCreated: jest.fn(async () => {}),
  },
}));

jest.mock('../../side-effects/events/in-process-event-bus', () => ({
  appEventBus: {
    publish: jest.fn(async () => {}),
  },
}));

describe('message service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
  });

  it('createMessage throws for non-member', async () => {
    (mockMemberService.getByUserAndChat as any).mockResolvedValue(null);
    const service = (await import('../../modules/message/service')).default;

    await expect(service.createMessage({ chatId: 1, userId: 10, content: 'Hello' })).rejects.toBeInstanceOf(ServerError);
  });

  it('updateMessage throws when message missing', async () => {
    (mockMessageQueries.getById as any).mockResolvedValue(null);
    const service = (await import('../../modules/message/service')).default;

    await expect(service.updateMessage(999, 1, { content: 'edit' })).rejects.toBeInstanceOf(ServerError);
  });

  it('deleteMessage allows owner', async () => {
    (mockMessageQueries.getById as any).mockResolvedValue({ id: 8, chatId: 7, userId: 3 });
    (mockMessageCommands.delete as any).mockResolvedValue(true);

    const service = (await import('../../modules/message/service')).default;
    await expect(service.deleteMessage(8, 3, 7)).resolves.toBe(true);
  });
});
