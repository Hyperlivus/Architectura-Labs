export type MessageCreatedRateContext = {
  userId: number;
  chatId: number;
  messageId: number;
};

export interface IMessageRateLimiter {
  onMessageCreated(context: MessageCreatedRateContext): Promise<void>;
}
