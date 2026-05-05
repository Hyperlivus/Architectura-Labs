import type { MessageWasCreatedEvent } from '../events/domain-events';
import { appEventBus } from '../events/in-process-event-bus';
import { userQueries } from '../../modules/user/dal';
import mailer from '../../providers/mailer';
import { broadcastRealtime } from './realtime-hub';

const mentionPattern = /@([a-zA-Z0-9_]+)/g;

function extractMentionTags(content: string): string[] {
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(mentionPattern.source, mentionPattern.flags);
  while ((match = re.exec(content)) !== null) {
    tags.add(match[1]);
  }
  return [...tags];
}

export function registerMessageNotificationBroadcaster(): void {
  appEventBus.subscribe<MessageWasCreatedEvent>('MessageWasCreated', async (event) => {
    const { payload } = event;
    broadcastRealtime({
      event: 'MessageWasCreated',
      payload,
    });

    const tags = extractMentionTags(payload.content);
    if (tags.length === 0) {
      return;
    }

    const users = await userQueries.getByTags(tags);
    const targets = users.filter((u) => u.id !== payload.authorUserId);

    await Promise.all(
      targets.map((user) =>
        mailer.sendMail({
          to: user.email,
          from: 'chat@gmail.com',
          subject: 'You were mentioned in a chat',
          text: `You were mentioned (@${user.tag}) in chat ${payload.chatId}: ${payload.content}`,
        }),
      ),
    );
  });
}
