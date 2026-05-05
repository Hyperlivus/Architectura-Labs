import { messageCommands, messageQueries } from './dal';
import { MessageCreationAttributes, MessageUpdateAttributes } from './types';
import { throwServerError, ServerErrorCode } from '../../providers/errors';
import memberService from '../member/service';
import { MemberPermission } from '../member/permissions';
import db from '../../providers/db';
import { messageRateLimiter } from '../../side-effects/rate-limit/db-message-rate-limiter';
import { appEventBus } from '../../side-effects/events/in-process-event-bus';
import { buildMessageWasCreatedEvent } from '../../side-effects/events/message-was-created';

const service = {
  queries: messageQueries,
  commands: messageCommands,

  async createMessage(data: MessageCreationAttributes): Promise<any> {
    const message = await db.withTransaction(async () => {
      const member = await memberService.getByUserAndChat(data.userId, data.chatId);
      if (!member || member.banned) {
        throwServerError({ code: ServerErrorCode.FORBIDDEN, message: 'Not a member of this chat', status: 403 });
      }

      const created = await messageCommands.create(data);
      await messageRateLimiter.onMessageCreated({
        userId: data.userId,
        chatId: data.chatId,
        messageId: created.id,
      });
      return created;
    });

    setImmediate(() => {
      void appEventBus.publish(
        buildMessageWasCreatedEvent({
          messageId: message.id,
          chatId: message.chatId,
          authorUserId: message.userId,
          content: message.content,
          createdAt: message.createdAt,
        }),
      );
    });

    return message;
  },

  async getMessageById(id: number): Promise<any> {
    const message = await messageQueries.getById(id);
    if (!message) {
      throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'Message not found', status: 404 });
    }
    return message;
  },

  async getMessagesByChat(chatId: number, userId: number, limit?: number, offset?: number): Promise<any[]> {
    const member = await memberService.getByUserAndChat(userId, chatId);
    if (!member || member.banned) {
      throwServerError({ code: ServerErrorCode.FORBIDDEN, message: 'Not a member of this chat', status: 403 });
    }

    return messageQueries.getByChat(chatId, limit, offset);
  },

  async updateMessage(id: number, userId: number, data: MessageUpdateAttributes): Promise<any> {
    return db.withTransaction(async () => {
      const message = await messageQueries.getById(id);
      if (!message) {
        throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'Message not found', status: 404 });
      }

      if (message.userId !== userId) {
        throwServerError({ code: ServerErrorCode.FORBIDDEN, message: 'Cannot edit this message', status: 403 });
      }

      return messageCommands.update(id, data);
    });
  },

  async deleteMessage(id: number, userId: number, chatId: number): Promise<boolean> {
    return db.withTransaction(async () => {
      const message = await messageQueries.getById(id);
      if (!message || message.chatId !== chatId) {
        throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'Message not found', status: 404 });
      }

      if (message.userId !== userId) {
        const member = await memberService.getByUserAndChat(userId, message.chatId);
        if (!member || !(await memberService.hasPermission(member.id, MemberPermission.MemberRemove))) {
          throwServerError({ code: ServerErrorCode.FORBIDDEN, message: 'Cannot delete this message', status: 403 });
        }
      }

      return messageCommands.delete(id);
    });
  },
};

export default service;
