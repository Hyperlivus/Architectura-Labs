import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServerError } from '../../providers/errors';

const mockUserService = {
  getById: jest.fn(),
  getByTagOrEmail: jest.fn(),
  getByTag: jest.fn(),
  getByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockOtpService = {
  generateOtp: jest.fn(),
};

const mockJwt = {
  generateToken: jest.fn(),
};

const mockMailer = {
  sendMail: jest.fn(),
};

const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn(),
};

jest.mock('../../modules/user/service', () => ({
  __esModule: true,
  default: mockUserService,
}));

jest.mock('../../services/otp', () => ({
  __esModule: true,
  default: mockOtpService,
}));

jest.mock('../../services/jwt', () => ({
  __esModule: true,
  default: mockJwt,
}));

jest.mock('../../providers/mailer', () => ({
  __esModule: true,
  default: mockMailer,
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: mockBcrypt,
  ...mockBcrypt,
}));

describe('auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('login returns access token for valid credentials', async () => {
    const user = { id: 1, email: 'a@b.com', tag: 'ab', password: '$2b$10$WQfPkAlFQ5xNRsTAAdMZbeDaxQOlI8nLK2Q1VfVq95a4LZ4fVfUl6' };
    (mockUserService.getByTagOrEmail as any).mockResolvedValue(user);
    (mockJwt.generateToken as any).mockReturnValue('token-1');

    (mockBcrypt.compare as any).mockResolvedValue(true);

    const service = (await import('../../modules/auth/service')).default;
    const result = await service.login({ emailOrTag: 'ab', password: 'Test123!' });

    expect(result).toBe('token-1');
    expect(mockUserService.getByTagOrEmail).toHaveBeenCalledWith('ab');
  });

  it('register rejects duplicate email', async () => {
    (mockUserService.getByTag as any).mockResolvedValue(null);
    (mockUserService.getByEmail as any).mockResolvedValue({ email: 'dup@example.com', tag: 'x' });

    const service = (await import('../../modules/auth/service')).default;

    await expect(
      service.register({
        email: 'dup@example.com',
        nickname: 'User',
        tag: 'tag',
        password: 'Test123!',
      })
    ).rejects.toBeInstanceOf(ServerError);
  });

  it('verifyOtp updates user when otp is valid', async () => {
    (mockUserService.getById as any).mockResolvedValue({ id: 1, otp: '123456' });
    (mockUserService.update as any).mockResolvedValue({ id: 1, otp: null, email_verified: true });

    const service = (await import('../../modules/auth/service')).default;
    const result = await service.verifyOtp(1, '123456');

    expect(result).toEqual({ id: 1, otp: null, email_verified: true });
    expect(mockUserService.update).toHaveBeenCalledWith(1, { otp: null, email_verified: true });
  });
});
