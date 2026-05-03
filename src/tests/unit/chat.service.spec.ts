import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServerError } from '../../providers/errors';

const mockChatCommands = {
  create: jest.fn(),
  update: jest.fn(),
};

const mockChatQueries = {
  getById: jest.fn(),
  getByIds: jest.fn(),
};

const mockMemberService = {
  ensureMember: jest.fn(),
  getByUserId: jest.fn(),
};

jest.mock('../../modules/chat/dal', () => ({
  __esModule: true,
  chatCommands: mockChatCommands,
  chatQueries: mockChatQueries,
}));

jest.mock('../../modules/member/service', () => ({
  __esModule: true,
  default: mockMemberService,
}));

describe('chat service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createChat creates chat and owner member', async () => {
    const chat = { id: 10, title: 'General' };
    (mockChatCommands.create as any).mockResolvedValue(chat);

    const service = (await import('../../modules/chat/service')).default;
    const result = await service.createChat(
      { title: 'General', description: 'Main', tag: 'general' },
      1
    );

    expect(result).toEqual(chat);
    expect(mockMemberService.ensureMember).toHaveBeenCalled();
  });

  it('updateChat throws when chat does not exist', async () => {
    (mockChatQueries.getById as any).mockResolvedValue(null);
    const service = (await import('../../modules/chat/service')).default;

    await expect(service.updateChat(999, { title: 'x' })).rejects.toBeInstanceOf(ServerError);
  });

  it('getUserChats returns empty list when user has no memberships', async () => {
    (mockMemberService.getByUserId as any).mockResolvedValue([]);
    const service = (await import('../../modules/chat/service')).default;

    await expect(service.getUserChats(12)).resolves.toEqual([]);
    expect(mockChatQueries.getByIds).not.toHaveBeenCalled();
  });
});
