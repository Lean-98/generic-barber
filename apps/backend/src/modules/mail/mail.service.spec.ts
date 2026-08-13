import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

describe('MailService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  async function buildService(configValues: Record<string, string | undefined>): Promise<MailService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => configValues[key]) },
        },
      ],
    }).compile();
    return module.get(MailService);
  }

  it('should not throw and should skip sending when RESEND_API_KEY is not configured', async () => {
    const service = await buildService({ MAIL_FROM: 'test@test.com' });

    await expect(
      service.sendPasswordResetEmail('user@test.com', 'https://x/reset-password?token=abc'),
    ).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('should send the email through Resend when an API key is configured', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await service.sendPasswordResetEmail('user@test.com', 'https://x/reset-password?token=abc');

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@test.com', from: 'test@test.com' }),
    );
  });

  it('should not throw when Resend returns an error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await expect(
      service.sendPasswordResetEmail('user@test.com', 'https://x/reset-password?token=abc'),
    ).resolves.toBeUndefined();
  });
});
