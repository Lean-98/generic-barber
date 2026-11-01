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

  it('should include the reservation policy in the confirmation when it is set', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await service.sendTurnoConfirmacion('user@test.com', {
      ...turnoData,
      politicaReservas: 'Cancelaciones con 24hs de anticipación.',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Cancelaciones con 24hs de anticipación.'),
      }),
    );
  });

  it('should not render the reservation policy block when it is not set', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await service.sendTurnoConfirmacion('user@test.com', turnoData);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.not.stringContaining('Política de reservas'),
      }),
    );
  });

  it('should render the business name in the header', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await service.sendTurnoConfirmacion('user@test.com', { ...turnoData, nombreNegocio: 'Authentic Barber' });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining('Authentic Barber') }),
    );
  });

  it('should use the custom primary color when it is a valid hex', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await service.sendTurnoConfirmacion('user@test.com', { ...turnoData, colorPrimario: '#123ABC' });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining('#123ABC') }),
    );
  });

  it('should fall back to the default brand color when colorPrimario is invalid', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await service.sendTurnoConfirmacion('user@test.com', { ...turnoData, colorPrimario: 'not-a-color' });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining('#A9762F') }),
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

  it('should include the cancel button only when a cancel link is passed', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

    await service.sendTurnoConfirmacion('user@test.com', { ...turnoData, cancelarUrl: 'https://x/cancelar-turno?token=1.abc' });
    await service.sendTurnoConfirmacion('user@test.com', turnoData);

    expect(sendMock.mock.calls[0][0].html).toContain('https://x/cancelar-turno?token=1.abc');
    expect(sendMock.mock.calls[0][0].html).toContain('Cancelar turno');
    expect(sendMock.mock.calls[1][0].html).not.toContain('Cancelar turno');
  });

  describe('sendAvisoCancelacion', () => {
    const aviso = {
      nombreCliente: 'Juan <b>Pérez</b>',
      telefonoCliente: '(2954) 12-3456',
      fechaHoraInicio: new Date('2026-06-16T13:00:00.000Z'),
      canceladoEn: new Date('2026-06-16T10:45:00.000Z'),
      servicios: ['Corte', 'Barba'],
    };

    it('should send to every recipient with the advance notice and a WhatsApp link', async () => {
      sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
      const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

      await expect(service.sendAvisoCancelacion(['a@test.com', 'b@test.com'], aviso)).resolves.toBe(true);

      const enviado = sendMock.mock.calls[0][0];
      expect(enviado.to).toEqual(['a@test.com', 'b@test.com']);
      expect(enviado.html).toContain('Canceló 2 h 15 min antes');
      expect(enviado.html).toContain('https://wa.me/5492954123456');
      expect(enviado.html).toContain('Corte, Barba');
    });

    it('should escape client-provided names in the HTML', async () => {
      sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
      const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

      await service.sendAvisoCancelacion(['a@test.com'], aviso);

      expect(sendMock.mock.calls[0][0].html).toContain('Juan &lt;b&gt;Pérez&lt;/b&gt;');
      expect(sendMock.mock.calls[0][0].html).not.toContain('<b>Pérez</b>');
    });

    it('should skip the WhatsApp button when the phone cannot be turned into a link', async () => {
      sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
      const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

      await service.sendAvisoCancelacion(['a@test.com'], { ...aviso, telefonoCliente: '4123456' });

      expect(sendMock.mock.calls[0][0].html).not.toContain('wa.me');
      expect(sendMock.mock.calls[0][0].html).toContain('4123456');
    });

    it('should not send when there are no recipients', async () => {
      const service = await buildService({ RESEND_API_KEY: 're_test', MAIL_FROM: 'test@test.com' });

      await expect(service.sendAvisoCancelacion([], aviso)).resolves.toBe(false);
      expect(sendMock).not.toHaveBeenCalled();
    });
  });
});
