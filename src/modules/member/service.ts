import dal from './dal';
import { MemberCreationAttributes } from './types';
import { MemberPermission, MemberPermissions } from './permissions';
import { throwServerError, ServerErrorCode } from '../../providers/errors';
import { authGuard } from '../auth/guard';
import { FastifyRequest } from 'fastify';

export const MEMBER_PERMISSIONS: MemberPermissions = {
  [MemberPermission.ChatUpdate]: true,
  [MemberPermission.MemberAdd]: true,
  [MemberPermission.MemberRemove]: true,
  [MemberPermission.MemberPermissions]: true,
};

const service = {
  getById: dal.getById,
  getByUserAndChat: dal.getByUserAndChat,
  getByUserId: (userId: number) => dal.getByUserId(userId),
  getByChatId: (chatId: number) => dal.getByChatId(chatId),

  async ensureMember(userId: number, chatId: number, permissions: MemberPermissions) {
    const existing = await dal.getByUserAndChat(userId, chatId);
    if (existing) {
      const updatedMember = await dal.update(existing.id, { banned: false });
      await dal.updatePermissions(existing.id, permissions);
      return updatedMember;
    }

    const member = await dal.create({ userId, chatId, banned: false });
    await dal.updatePermissions(member.id, permissions);
    return member;
  },

  async removeMember(memberId: number) {
    const existing = await dal.getById(memberId);
    if (!existing) {
      throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'Member not found', status: 404 });
    }
    return dal.update(memberId, { banned: true });
  },

  async updatePermissions(memberId: number, permissions: MemberPermissions) {
    const existing = await dal.getById(memberId);
    if (!existing) {
      throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'Member not found', status: 404 });
    }
    await dal.updatePermissions(memberId, permissions);
    return await dal.getById(memberId);
  },

  async hasPermission(memberId: number, permission: MemberPermission) {
    const permissions = await dal.getPermissions(memberId);
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
    const currentMember = await dal.getByUserAndChat(authUser.id, chatId);

    if (!currentMember || currentMember.banned) {
      throwServerError({ code: ServerErrorCode.FORBIDDEN, message: 'Access denied', status: 403 });
    }

    if (allowSelf && targetMemberId && currentMember.id === targetMemberId) {
      return authUser;
    }

    if (allowSelf && targetMemberId) {
      const targetMember = await dal.getById(targetMemberId);
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
