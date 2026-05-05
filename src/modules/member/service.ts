import { memberCommands, memberQueries } from './dal';
import { MemberPermission, MemberPermissions } from './permissions';
import { throwServerError, ServerErrorCode } from '../../providers/errors';
import { authGuard } from '../auth/guard';
import { FastifyRequest } from 'fastify';
import db from '../../providers/db';

export const MEMBER_PERMISSIONS: MemberPermissions = {
  [MemberPermission.ChatUpdate]: true,
  [MemberPermission.MemberAdd]: true,
  [MemberPermission.MemberRemove]: true,
  [MemberPermission.MemberPermissions]: true,
};

const service = {
  queries: memberQueries,
  commands: memberCommands,

  getById: memberQueries.getById,
  getByUserAndChat: memberQueries.getByUserAndChat,
  getByUserId: (userId: number) => memberQueries.getByUserId(userId),
  getByChatId: (chatId: number) => memberQueries.getByChatId(chatId),

  async ensureMember(userId: number, chatId: number, permissions: MemberPermissions) {
    const existing = await memberQueries.getByUserAndChat(userId, chatId);
    if (existing) {
      const updatedMember = await memberCommands.update(existing.id, { banned: false });
      await memberCommands.updatePermissions(existing.id, permissions);
      return updatedMember;
    }

    const member = await memberCommands.create({ userId, chatId, banned: false });
    await memberCommands.updatePermissions(member.id, permissions);
    return member;
  },

  async addMemberToChat(userId: number, chatId: number, permissions: MemberPermissions) {
    return db.withTransaction(async () => service.ensureMember(userId, chatId, permissions));
  },

  async removeMember(memberId: number) {
    return db.withTransaction(async () => {
      const existing = await memberQueries.getById(memberId);
      if (!existing) {
        throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'Member not found', status: 404 });
      }
      return memberCommands.update(memberId, { banned: true });
    });
  },

  async updatePermissions(memberId: number, permissions: MemberPermissions) {
    return db.withTransaction(async () => {
      const existing = await memberQueries.getById(memberId);
      if (!existing) {
        throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'Member not found', status: 404 });
      }
      await memberCommands.updatePermissions(memberId, permissions);
      return memberQueries.getById(memberId);
    });
  },

  async hasPermission(memberId: number, permission: MemberPermission) {
    const permissions = await memberQueries.getPermissions(memberId);
    return permissions[permission] === true;
  },

  async validatePermission(
    request: FastifyRequest,
    chatId: number,
    requiredPermission: MemberPermission,
    targetMemberId?: number,
    allowSelf = false
  ) {
    const authUser = await authGuard(request);
    const currentMember = await memberQueries.getByUserAndChat(authUser.id, chatId);

    if (!currentMember || currentMember.banned) {
      throwServerError({ code: ServerErrorCode.FORBIDDEN, message: 'Access denied', status: 403 });
    }

    if (allowSelf && targetMemberId && currentMember.id === targetMemberId) {
      return authUser;
    }

    if (allowSelf && targetMemberId) {
      const targetMember = await memberQueries.getById(targetMemberId);
      if (targetMember?.userId === authUser.id) {
        return authUser;
      }
    }

    const hasPermission = await service.hasPermission(currentMember.id, requiredPermission);
    if (!hasPermission) {
      throwServerError({ code: ServerErrorCode.FORBIDDEN, message: 'Access denied', status: 403 });
    }

    return authUser;
  },
};

export default service;
