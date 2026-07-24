import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { CreateTurnoDto } from './dto/create-turno.dto';

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
      ],
    }).compile();

    service = module.get<TurnosService>(TurnosService);
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
      prismaMock.turnoDetalle.create.mockResolvedValue({
        idTurnoDetalle: 1,
        idTurno: 1,
        idServicio: 1,
        precioReal: 25.0,
        cantidad: 1,
      });
      prismaMock.turno.findUnique.mockResolvedValue({
        ...mockTurno,
        detalles: [{ servicio: mockServicio, precioReal: 25.0, cantidad: 1 }],
        persona: mockPersona,
      });
      prismaMock.turno.update.mockResolvedValue({ ...mockTurno, googleEventId: 'google-event-123' });

      const dto: CreateTurnoDto = {
        idPersona: 1,
        fechaHoraInicio: '2026-06-15T10:00:00.000Z',
        servicios: [{ idServicio: 1, cantidad: 1 }],
      };

      // Act
      const result = await service.create(dto);

      // Assert
      expect(prismaMock.turno.create).toHaveBeenCalled();
      expect(result).toBeDefined();
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

    it('should throw if horario not available', async () => {
      prismaMock.persona.findUnique.mockResolvedValue(mockPersona);
      prismaMock.servicio.findMany.mockResolvedValue([mockServicio]);
      prismaMock.turno.findMany.mockResolvedValue([mockTurno]);

      const dto: CreateTurnoDto = {
        idPersona: 1,
        fechaHoraInicio: '2026-06-15T10:00:00.000Z',
        servicios: [{ idServicio: 1 }],
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
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
});
