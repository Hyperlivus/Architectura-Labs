import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServerError, ServerErrorCode } from '../../providers/errors';

const mockDb: any = {
  one: jest.fn(),
};

jest.mock('../../db/context', () => ({
  __esModule: true,
  getDb: () => mockDb,
}));

describe('DbMessageRateLimiter', () => {
  const previousLimit = process.env.MESSAGE_RATE_LIMIT_PER_MINUTE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MESSAGE_RATE_LIMIT_PER_MINUTE = '2';
  });

  afterAll(() => {
    if (previousLimit === undefined) {
      delete process.env.MESSAGE_RATE_LIMIT_PER_MINUTE;
      return;
    }
    process.env.MESSAGE_RATE_LIMIT_PER_MINUTE = previousLimit;
  });

  it('allows message when counter is within configured limit', async () => {
    mockDb.one.mockResolvedValue({ message_count: 2 });
    const { DbMessageRateLimiter } = await import('../../side-effects/rate-limit/db-message-rate-limiter');
    const limiter = new DbMessageRateLimiter();

    await expect(limiter.onMessageCreated({ userId: 1, chatId: 10, messageId: 100 })).resolves.toBeUndefined();
    expect(mockDb.one).toHaveBeenCalledTimes(1);
  });

  it('throws 429 when counter exceeds configured limit', async () => {
    mockDb.one.mockResolvedValue({ message_count: 3 });
    const { DbMessageRateLimiter } = await import('../../side-effects/rate-limit/db-message-rate-limiter');
    const limiter = new DbMessageRateLimiter();

    await expect(limiter.onMessageCreated({ userId: 1, chatId: 10, messageId: 100 })).rejects.toBeInstanceOf(ServerError);
    await expect(limiter.onMessageCreated({ userId: 1, chatId: 10, messageId: 100 })).rejects.toMatchObject({
      code: ServerErrorCode.TOO_MANY_REQUESTS,
      status: 429,
    });
  });
});
