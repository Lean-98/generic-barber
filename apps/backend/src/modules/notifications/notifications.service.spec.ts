import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { verificarTokenCancelacion } from '../turnos/cancelacion-token.util';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: PrismaServiceMock;
  let mailMock: { sendTurnoRecordatorio: jest.Mock };

  const mockTurno = {
    idTurno: 1,
    fechaHoraInicio: new Date(),
    persona: { nombre: 'Juan', mail: 'juan@test.com' },
    detalles: [{ servicio: { nombre: 'Corte' } }],
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();
    mailMock = { sendTurnoRecordatorio: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MailService, useValue: mailMock },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => ({ FRONTEND_URL: 'https://barber.test', JWT_SECRET: 'secreto-test' } as Record<string, string>)[k] },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send a reminder and mark it as sent for a turno within the window', async () => {
    prismaMock.configuracionNegocio.findUnique.mockResolvedValue({ recordatorioHorasAntes: 24, direccion: null, whatsappUrl: null });
    prismaMock.turno.findMany.mockResolvedValue([mockTurno]);
    prismaMock.turno.update.mockResolvedValue({});

    await service.enviarRecordatorios();

    expect(mailMock.sendTurnoRecordatorio).toHaveBeenCalledWith(
      'juan@test.com',
      expect.objectContaining({ nombreCliente: 'Juan', servicios: ['Corte'] }),
    );
    expect(prismaMock.turno.update).toHaveBeenCalledWith({
      where: { idTurno: 1 },
      data: { recordatorioEnviadoEn: expect.any(Date) },
    });
  });

  it('should not send anything when the negocio turned reminders off', async () => {
    prismaMock.configuracionNegocio.findUnique.mockResolvedValue({ recordatorioActivo: false, recordatorioHorasAntes: 24 });
    prismaMock.turno.findMany.mockResolvedValue([mockTurno]);

    await service.enviarRecordatorios();

    expect(prismaMock.turno.findMany).not.toHaveBeenCalled();
    expect(mailMock.sendTurnoRecordatorio).not.toHaveBeenCalled();
    expect(prismaMock.turno.update).not.toHaveBeenCalled();
  });

  it('should skip turnos without an email on file', async () => {
    prismaMock.configuracionNegocio.findUnique.mockResolvedValue({ recordatorioHorasAntes: 24 });
    prismaMock.turno.findMany.mockResolvedValue([{ ...mockTurno, persona: { nombre: 'Juan', mail: null } }]);

    await service.enviarRecordatorios();

    expect(mailMock.sendTurnoRecordatorio).not.toHaveBeenCalled();
    expect(prismaMock.turno.update).not.toHaveBeenCalled();
  });

  it('should fall back to 24 hours when the business has no config row yet', async () => {
    prismaMock.configuracionNegocio.findUnique.mockResolvedValue(null);
    prismaMock.turno.findMany.mockResolvedValue([]);

    await service.enviarRecordatorios();

    const where = prismaMock.turno.findMany.mock.calls[0][0].where;
    const ventanaHoras = (where.fechaHoraInicio.lte.getTime() - where.fechaHoraInicio.gte.getTime()) / 3_600_000;
    expect(ventanaHoras).toBeCloseTo(24, 1);
  });

  it('should not throw if sending the reminder fails for one turno', async () => {
    prismaMock.configuracionNegocio.findUnique.mockResolvedValue({ recordatorioHorasAntes: 24 });
    prismaMock.turno.findMany.mockResolvedValue([mockTurno]);
    mailMock.sendTurnoRecordatorio.mockRejectedValue(new Error('boom'));

    await expect(service.enviarRecordatorios()).resolves.toBeUndefined();
    expect(prismaMock.turno.update).not.toHaveBeenCalled();
  });

  it('should not mark the reminder as sent when the mail service reports it was not actually sent', async () => {
    prismaMock.configuracionNegocio.findUnique.mockResolvedValue({ recordatorioHorasAntes: 24 });
    prismaMock.turno.findMany.mockResolvedValue([mockTurno]);
    mailMock.sendTurnoRecordatorio.mockResolvedValue(false);

    await service.enviarRecordatorios();

    expect(prismaMock.turno.update).not.toHaveBeenCalled();
  });

  it('should include a signed cancel link for the turno in the reminder', async () => {
    prismaMock.configuracionNegocio.findUnique.mockResolvedValue({ recordatorioHorasAntes: 24 });
    prismaMock.turno.findMany.mockResolvedValue([mockTurno]);
    prismaMock.turno.update.mockResolvedValue({});

    await service.enviarRecordatorios();

    const { cancelarUrl } = mailMock.sendTurnoRecordatorio.mock.calls[0][1];
    expect(cancelarUrl).toMatch(/^https:\/\/barber\.test\/cancelar-turno\?token=/);
    const token = new URL(cancelarUrl).searchParams.get('token');
    expect(verificarTokenCancelacion(token, 'secreto-test')).toBe(1);
  });
});
