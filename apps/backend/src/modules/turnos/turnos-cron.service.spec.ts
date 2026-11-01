import { Test, TestingModule } from '@nestjs/testing';
import { TurnosCronService } from './turnos-cron.service';
import { TurnosService } from './turnos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';

describe('TurnosCronService', () => {
  let service: TurnosCronService;
  let prismaMock: PrismaServiceMock;
  let turnosServiceMock: { confirmar: jest.Mock; iniciarAtencion: jest.Mock; finalizar: jest.Mock };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();
    turnosServiceMock = {
      confirmar: jest.fn().mockResolvedValue({}),
      iniciarAtencion: jest.fn().mockResolvedValue({}),
      finalizar: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnosCronService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TurnosService, useValue: turnosServiceMock },
      ],
    }).compile();

    service = module.get<TurnosCronService>(TurnosCronService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should confirm leftover PENDIENTE turnos, start CONFIRMADO turnos whose time has come, and finish EN_PROCESO turnos whose time is up', async () => {
    prismaMock.turno.findMany
      .mockResolvedValueOnce([{ idTurno: 1 }]) // PENDIENTE rezagado
      .mockResolvedValueOnce([{ idTurno: 2 }]) // CONFIRMADO que arranca
      .mockResolvedValueOnce([{ idTurno: 3 }]); // EN_PROCESO que termina

    await service.procesarTransicionesAutomaticas();

    expect(turnosServiceMock.confirmar).toHaveBeenCalledWith(1);
    expect(turnosServiceMock.iniciarAtencion).toHaveBeenCalledWith(2);
    expect(turnosServiceMock.finalizar).toHaveBeenCalledWith(3);

    const wherePendientes = prismaMock.turno.findMany.mock.calls[0][0].where;
    expect(wherePendientes).toEqual({ estado: 'PENDIENTE' });

    const whereIniciar = prismaMock.turno.findMany.mock.calls[1][0].where;
    expect(whereIniciar.estado).toBe('CONFIRMADO');
    expect(whereIniciar.fechaHoraInicio.lte).toBeInstanceOf(Date);

    const whereFinalizar = prismaMock.turno.findMany.mock.calls[2][0].where;
    expect(whereFinalizar.estado).toBe('EN_PROCESO');
    expect(whereFinalizar.fechaHoraFin.lte).toBeInstanceOf(Date);
  });

  it('should not let one failing turno abort the rest of the batch', async () => {
    prismaMock.turno.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ idTurno: 10 }, { idTurno: 11 }])
      .mockResolvedValueOnce([]);
    turnosServiceMock.iniciarAtencion.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});

    await expect(service.procesarTransicionesAutomaticas()).resolves.toBeUndefined();

    expect(turnosServiceMock.iniciarAtencion).toHaveBeenCalledWith(10);
    expect(turnosServiceMock.iniciarAtencion).toHaveBeenCalledWith(11);
  });

  it('should do nothing when there are no matching turnos in any bucket', async () => {
    prismaMock.turno.findMany.mockResolvedValue([]);

    await service.procesarTransicionesAutomaticas();

    expect(turnosServiceMock.confirmar).not.toHaveBeenCalled();
    expect(turnosServiceMock.iniciarAtencion).not.toHaveBeenCalled();
    expect(turnosServiceMock.finalizar).not.toHaveBeenCalled();
  });
});
