import { chatCommands, chatQueries } from './dal';
import memberService, { MEMBER_PERMISSIONS } from '../member/service';
import { MemberPermissions, MemberPermission } from '../member/permissions';
import { ChatCreationAttributes, ChatUpdateAttributes } from './types';
import { throwServerError, ServerErrorCode } from '../../providers/errors';

const service = {
  queries: chatQueries,
  commands: chatCommands,

  async createChat(data: ChatCreationAttributes, ownerId: number) {
    const chat = await chatCommands.create(data);
    await memberService.ensureMember(ownerId, chat.id, {
      [MemberPermission.ChatUpdate]: true,
      [MemberPermission.MemberAdd]: true,
      [MemberPermission.MemberRemove]: true,
      [MemberPermission.MemberPermissions]: true,
    });
    return chat;
  },

  async updateChat(chatId: number, data: ChatUpdateAttributes) {
    if (!Object.keys(data).length) {
      throwServerError({ code: ServerErrorCode.BAD_REQUEST, message: 'No chat fields to update', status: 400 });
    }

    const existing = await chatQueries.getById(chatId);
    if (!existing) {
      throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'Chat not found', status: 404 });
    }

    return chatCommands.update(chatId, data);
  },

  getById: chatQueries.getById,

  async getUserChats(userId: number, search?: string, limit = 20, offset = 0) {
    const members = await memberService.getByUserId(userId);
    const chatIds = members.map(m => m.chatId);
    if (!chatIds.length) return [];

    return chatQueries.getByIds(chatIds, search, limit, offset);
  },
};

export default service;
