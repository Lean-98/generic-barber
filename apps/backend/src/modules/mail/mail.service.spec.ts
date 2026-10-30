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

  const turnoData = {
    nombreCliente: 'Juan',
    fechaHoraInicio: new Date('2026-06-15T13:00:00Z'),
    servicios: ['Corte de pelo'],
    direccion: 'Av. Siempre Viva 123',
    whatsappUrl: 'https://wa.me/5491112345678',
  };

  it('should skip sending turno confirmation when RESEND_API_KEY is not configured', async () => {
    const service = await buildService({ MAIL_FROM: 'test@test.com' });

    await expect(service.sendTurnoConfirmacion('user@test.com', turnoData)).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('should send turno confirmation with date and services in the body', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await service.sendTurnoConfirmacion('user@test.com', turnoData);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: '¡Turno confirmado!',
        html: expect.stringContaining('Corte de pelo'),
      }),
    );
  });

  it('should send turno reminder and report success', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await expect(service.sendTurnoRecordatorio('user@test.com', turnoData)).resolves.toBe(true);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@test.com', subject: 'Recordatorio de tu turno' }),
    );
  });

  it('should not throw and should report failure when sending turno reminder fails', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await expect(service.sendTurnoRecordatorio('user@test.com', turnoData)).resolves.toBe(false);
  });

  it('should report failure when sending turno reminder with no RESEND_API_KEY configured', async () => {
    const service = await buildService({ MAIL_FROM: 'test@test.com' });

    await expect(service.sendTurnoRecordatorio('user@test.com', turnoData)).resolves.toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
