import { Test, TestingModule } from '@nestjs/testing';
import { ReportesService } from './reportes.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';

describe('ReportesService', () => {
  let service: ReportesService;
  let prisma: PrismaServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportesService, { provide: PrismaService, useClass: PrismaServiceMock }],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
    prisma = module.get<PrismaService>(PrismaService) as unknown as PrismaServiceMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getResumen', () => {
    it('devuelve resumen con ingresos, egresos y balance', async () => {
      prisma.movimientoCaja.findMany = jest.fn().mockResolvedValue([
        { tipo: 'INGRESO', monto: 100 },
        { tipo: 'EGRESO', monto: 30 },
      ]);
      prisma.turno.findMany = jest.fn().mockResolvedValue([
        { estado: 'COMPLETADO', pagos: [{ idPago: 1 }] },
        { estado: 'PENDIENTE', pagos: [] },
        { estado: 'CANCELADO', pagos: [] },
      ]);

      const res = await service.getResumen('2026-07-01', '2026-07-31');

      expect(res.totalIngresos).toBe(100);
      expect(res.totalEgresos).toBe(30);
      expect(res.balance).toBe(70);
      expect(res.totalTurnos).toBe(3);
      expect(res.turnosPagados).toBe(1);
      expect(res.turnosCancelados).toBe(1);
    });
  });

  describe('getIngresosPorDia', () => {
    it('agrupa ingresos y egresos por día', async () => {
      const fecha = new Date('2026-07-23T10:00:00.000Z');
      prisma.movimientoCaja.findMany = jest.fn().mockResolvedValue([
        { tipo: 'INGRESO', monto: 100, fechaHora: fecha },
        { tipo: 'INGRESO', monto: 50, fechaHora: fecha },
        { tipo: 'EGRESO', monto: 20, fechaHora: fecha },
      ]);

      const res = await service.getIngresosPorDia('2026-07-01', '2026-07-31');

      expect(res).toHaveLength(1);
      expect(res[0].ingresos).toBe(150);
      expect(res[0].egresos).toBe(20);
      expect(res[0].balance).toBe(130);
    });
  });

  describe('getTurnosPorEstado', () => {
    it('agrupa turnos por estado', async () => {
      prisma.turno.groupBy = jest.fn().mockResolvedValue([
        { estado: 'CONFIRMADO', _count: { estado: 5 } },
        { estado: 'CANCELADO', _count: { estado: 2 } },
      ]);

      const res = await service.getTurnosPorEstado('2026-07-01', '2026-07-31');

      expect(res).toHaveLength(2);
      expect(res[0].cantidad).toBe(5);
    });
  });

  describe('getServiciosMasSolicitados', () => {
    it('calcula cantidad e ingresos por servicio', async () => {
      prisma.turnoDetalle.findMany = jest.fn().mockResolvedValue([
        { idServicio: 1, cantidad: 2, precioReal: 50, servicio: { nombre: 'Corte' } },
        { idServicio: 1, cantidad: 1, precioReal: 50, servicio: { nombre: 'Corte' } },
        { idServicio: 2, cantidad: 1, precioReal: 100, servicio: { nombre: 'Color' } },
      ]);

      const res = await service.getServiciosMasSolicitados('2026-07-01', '2026-07-31');

      expect(res).toHaveLength(2);
      expect(res[0].nombre).toBe('Corte');
      expect(res[0].cantidad).toBe(3);
      expect(res[0].ingresos).toBe(150);
    });
  });

  describe('getTopClientes', () => {
    it('calcula turnos e ingresos por cliente', async () => {
      prisma.turno.findMany = jest.fn().mockResolvedValue([
        {
          idPersona: 1,
          persona: { nombre: 'Juan', apellido: 'Pérez' },
          detalles: [{ precioReal: 50, cantidad: 1 }],
        },
        {
          idPersona: 1,
          persona: { nombre: 'Juan', apellido: 'Pérez' },
          detalles: [{ precioReal: 100, cantidad: 2 }],
        },
      ]);

      const res = await service.getTopClientes('2026-07-01', '2026-07-31');

      expect(res).toHaveLength(1);
      expect(res[0].cantidadTurnos).toBe(2);
      expect(res[0].ingresos).toBe(250);
    });
  });

  describe('getIngresosPorFormaPago', () => {
    it('agrrega ingresos por forma de pago', async () => {
      prisma.movimientoCaja.findMany = jest.fn().mockResolvedValue([
        { idFormaPago: 1, monto: 100, tipo: 'INGRESO', formaPago: { nombre: 'Efectivo' } },
        { idFormaPago: 1, monto: 50, tipo: 'INGRESO', formaPago: { nombre: 'Efectivo' } },
        { idFormaPago: 2, monto: 80, tipo: 'INGRESO', formaPago: { nombre: 'Tarjeta' } },
      ]);

      const res = await service.getIngresosPorFormaPago('2026-07-01', '2026-07-31');

      expect(res).toHaveLength(2);
      expect(res[0].monto).toBe(150);
      expect(res[0].nombre).toBe('Efectivo');
    });
  });
});
