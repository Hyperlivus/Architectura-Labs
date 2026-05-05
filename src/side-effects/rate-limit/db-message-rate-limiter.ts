import { getDb } from '../../db/context';
import { ServerErrorCode, throwServerError } from '../../providers/errors';
import type { IMessageRateLimiter, MessageCreatedRateContext } from './message-rate-limiter.types';

function parseLimit(): number {
  const raw = process.env.MESSAGE_RATE_LIMIT_PER_MINUTE;
  const n = raw ? parseInt(raw, 10) : 120;
  return Number.isFinite(n) && n > 0 ? n : 120;
}

export class DbMessageRateLimiter implements IMessageRateLimiter {
  async onMessageCreated(context: MessageCreatedRateContext): Promise<void> {
    const maxPerMinute = parseLimit();
    const row = await getDb().one<{ message_count: string | number }>(
      `
      INSERT INTO message_rate_counters (user_id, bucket_start, message_count)
      VALUES ($1, date_trunc('minute', timezone('UTC', now())), 1)
      ON CONFLICT (user_id, bucket_start)
      DO UPDATE SET message_count = message_rate_counters.message_count + 1
      RETURNING message_count
      `,
      [context.userId],
    );

    const count = typeof row.message_count === 'string' ? parseInt(row.message_count, 10) : row.message_count;
    if (count > maxPerMinute) {
      throwServerError({
        code: ServerErrorCode.TOO_MANY_REQUESTS,
        message: 'Message rate limit exceeded for this user',
        status: 429,
      });
    }
  }
}

export const messageRateLimiter: IMessageRateLimiter = new DbMessageRateLimiter();
