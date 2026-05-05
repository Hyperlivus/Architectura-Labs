export type MessageWasCreatedEvent = {
  readonly type: 'MessageWasCreated';
  readonly occurredAt: string;
  readonly payload: {
    readonly messageId: number;
    readonly chatId: number;
    readonly authorUserId: number;
    readonly content: string;
    readonly createdAt: string;
  };
};

export type AppDomainEvent = MessageWasCreatedEvent;
