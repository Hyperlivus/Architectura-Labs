import type { MessageWasCreatedEvent } from './domain-events';

export function buildMessageWasCreatedEvent(input: {
  messageId: number;
  chatId: number;
  authorUserId: number;
  content: string;
  createdAt: Date;
}): MessageWasCreatedEvent {
  const createdAt = input.createdAt.toISOString();
  return {
    type: 'MessageWasCreated',
    occurredAt: createdAt,
    payload: {
      messageId: input.messageId,
      chatId: input.chatId,
      authorUserId: input.authorUserId,
      content: input.content,
      createdAt,
    },
  };
}
