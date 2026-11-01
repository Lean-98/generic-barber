import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { MailService } from '../mail/mail.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { ConfigService } from '@nestjs/config';
import { generarTokenCancelacion } from './cancelacion-token.util';

/**
 * Test Unitario: TurnosService
 *
 * Cubre:
 * - CRUD de turnos
 * - Patrón State (transiciones de estado)
 * - Validación de disponibilidad
 */
describe('TurnosService', () => {
  let service: TurnosService;
  let prismaMock: PrismaServiceMock;

  const mockTurno = {
    idTurno: 1,
    idPersona: 1,
    fechaHoraInicio: new Date('2026-06-15T10:00:00Z'),
    fechaHoraFin: new Date('2026-06-15T10:30:00Z'),
    estado: 'PENDIENTE',
    observacion: null,
    fechaCreacion: new Date(),
  };

  const mockPersona = {
    idPersona: 1,
    nombre: 'Juan',
    apellido: 'Pérez',
  };

  const mockServicio = {
    idServicio: 1,
    nombre: 'Corte',
    precio: 25.0,
    duracionMinutos: 30,
    vigente: true,
  };

  const mockFormaPago = {
    idFormaPago: 1,
    nombre: 'Efectivo',
    requiereComprobante: false,
    vigente: true,
  };

  // Mismo horario real del negocio: domingo y lunes cerrado, martes a
  // sábado 09:00-13:30 y 16:30-20:30 (horario partido).
  const mockConfigConHorarios = {
    horarios: [
      { dia: 0, cerrado: true },
      { dia: 1, cerrado: true },
      { dia: 2, cerrado: false, abre: '09:00', cierra: '13:30', abre2: '16:30', cierra2: '20:30' },
      { dia: 3, cerrado: false, abre: '09:00', cierra: '13:30', abre2: '16:30', cierra2: '20:30' },
      { dia: 4, cerrado: false, abre: '09:00', cierra: '13:30', abre2: '16:30', cierra2: '20:30' },
      { dia: 5, cerrado: false, abre: '09:00', cierra: '13:30', abre2: '16:30', cierra2: '20:30' },
      { dia: 6, cerrado: false, abre: '09:00', cierra: '13:30', abre2: '16:30', cierra2: '20:30' },
    ],
  };
  // 2026-06-16 es martes; 13:00Z = 10:00 hora AR (UTC-3), dentro de la franja 09:00-13:30.
  const FECHA_DENTRO_DE_HORARIO = '2026-06-16T13:00:00.000Z';

  const SECRETO = 'secreto-test';

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: GoogleCalendarService,
          useValue: {
            createEvent: jest.fn().mockResolvedValue(null),
            updateEvent: jest.fn().mockResolvedValue(undefined),
            deleteEvent: jest.fn().mockResolvedValue(undefined),
            isConnected: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendTurnoConfirmacion: jest.fn().mockResolvedValue(undefined),
            sendTurnoRecordatorio: jest.fn().mockResolvedValue(undefined),
            sendAvisoCancelacion: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => ({ FRONTEND_URL: 'https://barber.test', JWT_SECRET: SECRETO } as Record<string, string>)[k] },
        },
      ],
    }).compile();

    service = module.get<TurnosService>(TurnosService);
    prismaMock.configuracionNegocio.findUnique.mockResolvedValue(mockConfigConHorarios);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a turno with correct duration', async () => {
      // Arrange
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.servicio.findMany.mockResolvedValue([mockServicio]);
      prismaMock.turno.findMany.mockResolvedValue([]);
      prismaMock.turno.create.mockResolvedValue({ ...mockTurno, persona: mockPersona });
      prismaMock.turnoDetalle.createMany.mockResolvedValue({ count: 1 });
      prismaMock.turno.findUnique.mockResolvedValue({
        ...mockTurno,
        detalles: [{ servicio: mockServicio, precioReal: 25.0, cantidad: 1 }],
        persona: mockPersona,
      });
      prismaMock.turno.update.mockResolvedValue({ ...mockTurno, googleEventId: 'google-event-123' });

      const dto: CreateTurnoDto = {
        idPersona: 1,
        fechaHoraInicio: FECHA_DENTRO_DE_HORARIO,
        servicios: [{ idServicio: 1, cantidad: 1 }],
      };

      // Act
      const result = await service.create(dto);

      // Assert
      expect(prismaMock.turno.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'CONFIRMADO' }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should persist idFormaPagoPreferida when it is a valid, vigente forma de pago', async () => {
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.servicio.findMany.mockResolvedValue([mockServicio]);
      prismaMock.formaPago.findUnique.mockResolvedValue(mockFormaPago);
      prismaMock.turno.findMany.mockResolvedValue([]);
      prismaMock.turno.create.mockResolvedValue({ ...mockTurno, persona: mockPersona });
      prismaMock.turnoDetalle.createMany.mockResolvedValue({ count: 1 });
      prismaMock.turno.findUnique.mockResolvedValue({
        ...mockTurno,
        detalles: [{ servicio: mockServicio, precioReal: 25.0, cantidad: 1 }],
        persona: mockPersona,
      });
      prismaMock.turno.update.mockResolvedValue(mockTurno);

      const dto: CreateTurnoDto = {
        idPersona: 1,
        fechaHoraInicio: FECHA_DENTRO_DE_HORARIO,
        servicios: [{ idServicio: 1, cantidad: 1 }],
        idFormaPagoPreferida: 1,
      };

      await service.create(dto);

      expect(prismaMock.turno.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ idFormaPagoPreferida: 1 }),
        }),
      );
    });

    it('should throw if idFormaPagoPreferida does not exist or is not vigente', async () => {
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.servicio.findMany.mockResolvedValue([mockServicio]);
      prismaMock.formaPago.findUnique.mockResolvedValue(null);

      const dto: CreateTurnoDto = {
        idPersona: 1,
        fechaHoraInicio: '2026-06-15T10:00:00.000Z',
        servicios: [{ idServicio: 1 }],
        idFormaPagoPreferida: 999,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(prismaMock.turno.create).not.toHaveBeenCalled();
    });

    it('should throw if person not found', async () => {
      prismaMock.persona.findUnique.mockResolvedValue(null);

      const dto: CreateTurnoDto = {
        idPersona: 999,
        fechaHoraInicio: '2026-06-15T10:00:00.000Z',
        servicios: [{ idServicio: 1 }],
      };

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if horario not available (se superpone con otro turno)', async () => {
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.servicio.findMany.mockResolvedValue([mockServicio]);
      prismaMock.turno.findMany.mockResolvedValue([mockTurno]);

      const dto: CreateTurnoDto = {
        idPersona: 1,
        fechaHoraInicio: FECHA_DENTRO_DE_HORARIO,
        servicios: [{ idServicio: 1 }],
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if the business is closed that day', async () => {
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.servicio.findMany.mockResolvedValue([mockServicio]);

      const dto: CreateTurnoDto = {
        idPersona: 1,
        fechaHoraInicio: '2026-06-15T13:00:00.000Z', // lunes 10:00 AR, día cerrado
        servicios: [{ idServicio: 1 }],
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(prismaMock.turno.create).not.toHaveBeenCalled();
    });

    it('should throw if the turno falls in the midday gap of an open day', async () => {
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.servicio.findMany.mockResolvedValue([mockServicio]);

      const dto: CreateTurnoDto = {
        idPersona: 1,
        fechaHoraInicio: '2026-06-16T17:00:00.000Z', // martes 14:00 AR, entre las dos franjas
        servicios: [{ idServicio: 1 }],
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(prismaMock.turno.create).not.toHaveBeenCalled();
    });
  });

  describe('Patrón State - confirmar', () => {
    it('should confirmar PENDIENTE -> CONFIRMADO', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(mockTurno);
      prismaMock.turno.update.mockResolvedValue({ ...mockTurno, estado: 'CONFIRMADO' });

      const result = await service.confirmar(1);
      expect(result.estado).toBe('CONFIRMADO');
    });

    it('should throw if confirmar CONFIRMADO', async () => {
      prismaMock.turno.findUnique.mockResolvedValue({ ...mockTurno, estado: 'CONFIRMADO' });

      await expect(service.confirmar(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Patrón State - cancelar', () => {
    it('should cancelar PENDIENTE -> CANCELADO', async () => {
      prismaMock.turno.findUnique.mockResolvedValue({ ...mockTurno, googleEventId: 'google-event-123' });
      prismaMock.turno.update.mockResolvedValue({ ...mockTurno, estado: 'CANCELADO', googleEventId: null });

      const result = await service.cancelar(1);
      expect(result.estado).toBe('CANCELADO');
    });

    it('should record that the cancellation came from the panel', async () => {
      prismaMock.turno.findUnique.mockResolvedValue({ ...mockTurno });
      prismaMock.turno.update.mockResolvedValue({ ...mockTurno, estado: 'CANCELADO' });

      await service.cancelar(1);

      expect(prismaMock.turno.update).toHaveBeenCalledWith({
        where: { idTurno: 1 },
        data: expect.objectContaining({ estado: 'CANCELADO', canceladoPor: 'PANEL', canceladoEn: expect.any(Date) }),
      });
    });

    it('should throw if cancelar COMPLETADO', async () => {
      prismaMock.turno.findUnique.mockResolvedValue({ ...mockTurno, estado: 'COMPLETADO' });

      await expect(service.cancelar(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Patrón State - iniciar', () => {
    it('should iniciar CONFIRMADO -> EN_PROCESO', async () => {
      prismaMock.turno.findUnique.mockResolvedValue({ ...mockTurno, estado: 'CONFIRMADO' });
      prismaMock.turno.update.mockResolvedValue({ ...mockTurno, estado: 'EN_PROCESO' });

      const result = await service.iniciarAtencion(1);
      expect(result.estado).toBe('EN_PROCESO');
    });

    it('should throw if iniciar PENDIENTE', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(mockTurno);

      await expect(service.iniciarAtencion(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Patrón State - finalizar', () => {
    it('should finalizar EN_PROCESO -> COMPLETADO', async () => {
      prismaMock.turno.findUnique.mockResolvedValue({ ...mockTurno, estado: 'EN_PROCESO' });
      prismaMock.turno.update.mockResolvedValue({ ...mockTurno, estado: 'COMPLETADO' });

      const result = await service.finalizar(1);
      expect(result.estado).toBe('COMPLETADO');
    });
  });

  describe('Patrón State - pagar', () => {
    it('should pagar COMPLETADO -> COMPLETADO', async () => {
      prismaMock.turno.findUnique.mockResolvedValue({ ...mockTurno, estado: 'COMPLETADO' });
      prismaMock.turno.update.mockResolvedValue({ ...mockTurno, estado: 'COMPLETADO' });

      const result = await service.registrarPago(1);
      expect(result.estado).toBe('COMPLETADO');
    });
  });

  describe('reservarPublica', () => {
    it('should pass idFormaPagoPreferida through to the created turno', async () => {
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.servicio.findMany.mockResolvedValue([mockServicio]);
      prismaMock.formaPago.findUnique.mockResolvedValue(mockFormaPago);
      prismaMock.turno.findMany.mockResolvedValue([]);
      prismaMock.turno.create.mockResolvedValue({ ...mockTurno, persona: mockPersona });
      prismaMock.turnoDetalle.createMany.mockResolvedValue({ count: 1 });
      prismaMock.turno.findUnique.mockResolvedValue({
        ...mockTurno,
        detalles: [{ servicio: mockServicio, precioReal: 25.0, cantidad: 1 }],
        persona: mockPersona,
      });
      prismaMock.turno.update.mockResolvedValue(mockTurno);

      await service.reservarPublica({
        email: 'juan@example.com',
        fechaHoraInicio: FECHA_DENTRO_DE_HORARIO,
        servicios: [{ idServicio: 1, cantidad: 1 }],
        idFormaPagoPreferida: 1,
      });

      expect(prismaMock.turno.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ idFormaPagoPreferida: 1, estado: 'CONFIRMADO' }),
        }),
      );
    });
  });

  describe('listarFormasPago', () => {
    it('should return only vigente formas de pago', async () => {
      prismaMock.formaPago.findMany.mockResolvedValue([mockFormaPago]);

      const result = await service.listarFormasPago();

      expect(prismaMock.formaPago.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { vigente: true } }),
      );
      expect(result).toEqual([mockFormaPago]);
    });
  });

  describe('calcularTotal', () => {
    it('should sum total from detalles', async () => {
      prismaMock.turno.findUnique.mockResolvedValue({
        ...mockTurno,
        detalles: [
          { precioReal: 25.0, cantidad: 1 },
          { precioReal: 50.0, cantidad: 2 },
        ],
      });

      const result = await service.calcularTotal(1);
      expect(result).toBe(125.0); // 25 + (50*2)
    });
  });

  describe('Cancelación por el cliente (link del mail)', () => {
    const enUnaHora = () => new Date(Date.now() + 60 * 60 * 1000);
    const turnoCliente = (extra: Record<string, unknown> = {}) => ({
      ...mockTurno,
      estado: 'CONFIRMADO',
      fechaHoraInicio: enUnaHora(),
      googleEventId: 'evt-1',
      persona: { nombre: 'Juan', apellido: 'Pérez', telefono: '2954123456' },
      detalles: [{ servicio: { nombre: 'Corte' } }],
      ...extra,
    });
    const token = () => generarTokenCancelacion(1, SECRETO);

    let mail: { sendAvisoCancelacion: jest.Mock; sendTurnoConfirmacion: jest.Mock };
    let calendar: { deleteEvent: jest.Mock };
    beforeEach(() => {
      mail = (service as any).mailService;
      calendar = (service as any).googleCalendarService;
    });

    it('should cancel even with less than an hour left, free the slot and notify the barber', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(turnoCliente());
      prismaMock.turno.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.configuracionNegocio.findUnique.mockResolvedValue({ email: 'barber@test.com', nombre: 'Authentic' });

      await service.cancelarPorCliente(token());

      expect(prismaMock.turno.updateMany).toHaveBeenCalledWith({
        where: { idTurno: 1, estado: { in: ['PENDIENTE', 'CONFIRMADO'] } },
        data: expect.objectContaining({ estado: 'CANCELADO', canceladoPor: 'CLIENTE', canceladoEn: expect.any(Date) }),
      });
      expect(calendar.deleteEvent).toHaveBeenCalledWith('evt-1');
      expect(mail.sendAvisoCancelacion).toHaveBeenCalledWith(
        ['barber@test.com'],
        expect.objectContaining({ nombreCliente: 'Juan Pérez', telefonoCliente: '2954123456', servicios: ['Corte'] }),
      );
    });

    it('should fall back to the panel users when the business has no contact email', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(turnoCliente());
      prismaMock.turno.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.configuracionNegocio.findUnique.mockResolvedValue({ email: null });
      prismaMock.usuarioWeb.findMany.mockResolvedValue([{ email: 'admin@test.com' }, { email: 'pelu@test.com' }]);

      await service.cancelarPorCliente(token());

      expect(mail.sendAvisoCancelacion).toHaveBeenCalledWith(['admin@test.com', 'pelu@test.com'], expect.anything());
    });

    it('should be idempotent: an already cancelled turno is not cancelled or notified again', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(turnoCliente({ estado: 'CANCELADO' }));

      const result = await service.cancelarPorCliente(token());

      expect(result.estado).toBe('CANCELADO');
      expect(prismaMock.turno.updateMany).not.toHaveBeenCalled();
      expect(mail.sendAvisoCancelacion).not.toHaveBeenCalled();
    });

    it('should not notify twice if another request cancelled it first (race)', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(turnoCliente());
      prismaMock.turno.updateMany.mockResolvedValue({ count: 0 });

      await service.cancelarPorCliente(token());

      expect(mail.sendAvisoCancelacion).not.toHaveBeenCalled();
      expect(calendar.deleteEvent).not.toHaveBeenCalled();
    });

    it('should reject a turno that already started', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(turnoCliente({ fechaHoraInicio: new Date(Date.now() - 60_000) }));

      await expect(service.cancelarPorCliente(token())).rejects.toThrow(BadRequestException);
      expect(prismaMock.turno.updateMany).not.toHaveBeenCalled();
    });

    it('should reject a turno in EN_PROCESO', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(turnoCliente({ estado: 'EN_PROCESO' }));

      await expect(service.cancelarPorCliente(token())).rejects.toThrow(BadRequestException);
    });

    it('should return 404 for a tampered token without touching the database', async () => {
      const [id, firma] = token().split('.');
      await expect(service.cancelarPorCliente(`2.${firma}`)).rejects.toThrow(NotFoundException);
      await expect(service.cancelarPorCliente(`${id}.x${firma.slice(1)}`)).rejects.toThrow(NotFoundException);
      await expect(service.cancelarPorCliente('basura')).rejects.toThrow(NotFoundException);
      expect(prismaMock.turno.findUnique).not.toHaveBeenCalled();
    });

    it('should still cancel if the barber notice fails', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(turnoCliente());
      prismaMock.turno.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.configuracionNegocio.findUnique.mockResolvedValue({ email: 'barber@test.com' });
      mail.sendAvisoCancelacion.mockRejectedValue(new Error('resend caído'));

      await expect(service.cancelarPorCliente(token())).resolves.toBeDefined();
      expect(prismaMock.turno.updateMany).toHaveBeenCalled();
    });

    it('should report whether the turno can still be cancelled, without exposing contact data', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(turnoCliente());

      const info = await service.getTurnoParaCancelar(token());

      expect(info).toEqual({
        nombreCliente: 'Juan',
        fechaHoraInicio: expect.any(Date),
        servicios: ['Corte'],
        estado: 'CONFIRMADO',
        puedeCancelar: true,
      });
    });
  });

  describe('marcarNoShow (el cliente no vino)', () => {
    const conEstado = (estado: string, extra: Record<string, unknown> = {}) => ({
      ...mockTurno, estado, googleEventId: 'evt-1', pagos: [], ...extra,
    });

    it.each(['CONFIRMADO', 'EN_PROCESO'])('should mark a %s turno as NO_SHOW and remove the calendar event', async (estado) => {
      prismaMock.turno.findUnique.mockResolvedValue(conEstado(estado));
      prismaMock.turno.update.mockResolvedValue(conEstado('NO_SHOW'));

      await service.marcarNoShow(1);

      expect(prismaMock.turno.update).toHaveBeenCalledWith({
        where: { idTurno: 1 },
        data: { estado: 'NO_SHOW', googleEventId: null },
      });
      expect((service as any).googleCalendarService.deleteEvent).toHaveBeenCalledWith('evt-1');
    });

    it('should allow it on a COMPLETADO turno that was never paid (closed by the cron)', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(conEstado('COMPLETADO'));
      prismaMock.turno.update.mockResolvedValue(conEstado('NO_SHOW'));

      await service.marcarNoShow(1);

      expect(prismaMock.turno.update).toHaveBeenCalled();
    });

    it('should reject it on a COMPLETADO turno that already has payments', async () => {
      prismaMock.turno.findUnique.mockResolvedValue(conEstado('COMPLETADO', { pagos: [{ idPago: 3 }] }));

      await expect(service.marcarNoShow(1)).rejects.toThrow(/ya tiene pagos/);
      expect(prismaMock.turno.update).not.toHaveBeenCalled();
    });

    it.each(['CANCELADO', 'NO_SHOW', 'PENDIENTE'])('should reject it on a %s turno', async (estado) => {
      prismaMock.turno.findUnique.mockResolvedValue(conEstado(estado));

      await expect(service.marcarNoShow(1)).rejects.toThrow(BadRequestException);
      expect(prismaMock.turno.update).not.toHaveBeenCalled();
    });
  });
});
