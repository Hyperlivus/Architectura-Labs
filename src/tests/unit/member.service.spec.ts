import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServerError } from '../../providers/errors';
import { MemberPermission } from '../../modules/member/permissions';

const mockMemberCommands = {
  create: jest.fn(),
  update: jest.fn(),
  updatePermissions: jest.fn(),
};

const mockMemberQueries = {
  getById: jest.fn(),
  getByUserAndChat: jest.fn(),
  getByUserId: jest.fn(),
  getByChatId: jest.fn(),
  getPermissions: jest.fn(),
};

const mockAuthGuard = jest.fn();

jest.mock('../../modules/member/dal', () => ({
  __esModule: true,
  memberCommands: mockMemberCommands,
  memberQueries: mockMemberQueries,
}));

jest.mock('../../modules/auth/guard', () => ({
  __esModule: true,
  authGuard: mockAuthGuard,
}));

describe('member service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ensureMember reactivates existing member', async () => {
    (mockMemberQueries.getByUserAndChat as any).mockResolvedValue({ id: 5, banned: true });
    (mockMemberCommands.update as any).mockResolvedValue({ id: 5, banned: false });

    const service = (await import('../../modules/member/service')).default;
    const result = await service.ensureMember(1, 10, {
      chatUpdate: true,
      memberAdd: false,
      memberRemove: false,
      memberPermissions: false,
    });

    expect(result).toEqual({ id: 5, banned: false });
    expect(mockMemberCommands.updatePermissions).toHaveBeenCalledWith(5, expect.any(Object));
  });

  it('removeMember throws when member missing', async () => {
    (mockMemberQueries.getById as any).mockResolvedValue(null);
    const service = (await import('../../modules/member/service')).default;

    await expect(service.removeMember(55)).rejects.toBeInstanceOf(ServerError);
  });

  it('hasPermission checks permission map', async () => {
    (mockMemberQueries.getPermissions as any).mockResolvedValue({
      chatUpdate: false,
      memberAdd: true,
      memberRemove: false,
      memberPermissions: false,
    });

    const service = (await import('../../modules/member/service')).default;
    await expect(service.hasPermission(1, MemberPermission.MemberAdd)).resolves.toBe(true);
  });
});
