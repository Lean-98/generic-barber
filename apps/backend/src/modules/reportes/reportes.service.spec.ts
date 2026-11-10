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

  describe('clientes inactivos', () => {
    const AHORA = new Date('2026-11-01T12:00:00Z');
    const haceDias = (d: number) => new Date(AHORA.getTime() - d * 86_400_000);
    const persona = (id: number, extra: Record<string, unknown> = {}) => ({
      idPersona: id, nombre: `N${id}`, apellido: `A${id}`, telefono: '3511234567', mail: null,
      createdAt: haceDias(400 - id), ...extra,
    });

    beforeEach(() => {
      prisma.turno.groupBy = jest.fn().mockResolvedValue([
        { idPersona: 1, _max: { fechaHoraInicio: haceDias(90) }, _count: { _all: 3 } },
        { idPersona: 2, _max: { fechaHoraInicio: haceDias(10) }, _count: { _all: 8 } },
        { idPersona: 3, _max: { fechaHoraInicio: haceDias(120) }, _count: { _all: 12 } },
        { idPersona: 4, _max: { fechaHoraInicio: haceDias(200) }, _count: { _all: 1 } },
      ]);
      // 4 ya tiene un turno reservado: no hace falta escribirle.
      prisma.turno.findMany = jest.fn().mockResolvedValue([{ idPersona: 4 }, { idPersona: 6 }]);
      prisma.persona.findMany = jest.fn().mockResolvedValue([1, 2, 3, 4, 5, 6].map((id) => persona(id)));
    });

    it('lists clients who stopped coming, most frequent first, skipping those already booked', async () => {
      const res = await service.getClientesInactivos(60, AHORA);

      expect(res.map((c) => c.idPersona)).toEqual([3, 1]);
      expect(res[0]).toEqual(expect.objectContaining({ visitas: 12, diasSinVenir: 120 }));
    });

    it('excludes staff and employees from the query', async () => {
      await service.getClientesInactivos(60, AHORA);

      expect(prisma.persona.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { aplicaDescuentoPersonal: false, usuarioWeb: { is: null } } }),
      );
    });

    it('respects the number of days', async () => {
      const res = await service.getClientesInactivos(150, AHORA);
      expect(res.map((c) => c.idPersona)).toEqual([]);
    });

    it('lists registered clients who never completed a turno and have nothing booked', async () => {
      const res = await service.getClientesSinVisitas(AHORA);

      expect(res.map((c) => c.idPersona)).toEqual([5]);
      expect(res[0]).toEqual(expect.objectContaining({ ultimaVisita: null, diasSinVenir: null, visitas: 0 }));
    });
  });

  describe('cumpleaños', () => {
    const det = (descuentoPorcentaje: number, descuentoMotivo: string | null) => ({ precioReal: 10000, cantidad: 1, descuentoPorcentaje, descuentoMotivo });

    it('counts sent and used cupones, and what was billed with them', async () => {
      prisma.cupon.findMany.mockResolvedValue([
        // Usado y completado con 20%.
        { recordatorioEnviadoEn: null, turnos: [{ estado: 'COMPLETADO', detalles: [det(20, 'CUPON')] }] },
        // Usado, el turno todavía no pasó.
        { recordatorioEnviadoEn: new Date(), turnos: [{ estado: 'CONFIRMADO', detalles: [det(20, 'CUPON')] }] },
        // Sin usar (los cancelados ya vienen filtrados).
        { recordatorioEnviadoEn: new Date(), turnos: [] },
        { recordatorioEnviadoEn: null, turnos: [] },
      ]);

      const r = await service.getCumpleanos('2026-11-01', '2026-11-30');

      expect(prisma.cupon.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { origen: 'CUMPLEANOS', createdAt: { gte: expect.any(Date), lte: expect.any(Date) } },
      }));
      expect(r).toEqual({
        enviados: 4,
        usados: 2,
        porcentajeUso: 50,
        recordatoriosEnviados: 2,
        turnosCompletados: 1,
        facturado: 8000,
        descuentoOtorgado: 2000,
      });
    });

    it('has no percentage without cupones', async () => {
      prisma.cupon.findMany.mockResolvedValue([]);
      expect((await service.getCumpleanos()).porcentajeUso).toBeNull();
    });
  });

  describe('rentabilidad', () => {
    const detalle = (extra: Record<string, unknown> = {}) => ({
      precioReal: 10000, cantidad: 1, descuentoPorcentaje: 0, descuentoMotivo: null,
      servicio: { costoInsumos: 1000, duracionMinutos: 30 }, ...extra,
    });

    beforeEach(() => {
      prisma.costosNegocio.findUnique.mockResolvedValue({ costosFijosMensuales: 300000, costoHoraTrabajo: 4000 });
      prisma.servicio.count = jest.fn().mockResolvedValue(2);
    });

    it('computes margin, prorated fixed costs and break-even', async () => {
      prisma.turno.findMany = jest.fn().mockResolvedValue([
        { detalles: [detalle()] },
        { detalles: [detalle()] },
        // Visita de fidelización: 50% off, se cobra 5000 pero cuesta lo mismo.
        { detalles: [detalle({ descuentoPorcentaje: 50, descuentoMotivo: 'FIDELIZACION' })] },
      ]);

      const r = await service.getRentabilidad('2026-11-01', '2026-11-30');

      // Cobrado: 10000 + 10000 + 5000. Costo variable por turno: 1000 + 4000 × 0,5 h = 3000.
      expect(r.dias).toBe(30);
      expect(r.ingresosServicios).toBe(25000);
      expect(r.costosVariables).toBe(9000);
      expect(r.margenContribucion).toBe(16000);
      expect(r.costosFijosPeriodo).toBe(300000);
      expect(r.resultado).toBe(-284000);
      expect(r.costoFidelizacion).toBe(5000);
      expect(r.serviciosConFidelizacion).toBe(1);
      expect(r.margenPromedioPorTurno).toBeCloseTo(5333.33, 2);
      expect(r.turnosParaCubrirFijosMes).toBe(57);
      expect(r.turnosFaltantesPeriodo).toBe(54);
      expect(r.costosConfigurados).toBe(true);
      expect(r.aviso).toBeNull();
    });

    it('does not divide by zero when there are no completed turnos', async () => {
      prisma.turno.findMany = jest.fn().mockResolvedValue([]);

      const r = await service.getRentabilidad('2026-11-01', '2026-11-15');

      expect(r.turnosCompletados).toBe(0);
      expect(r.margenPromedioPorTurno).toBeNull();
      expect(r.turnosParaCubrirFijosMes).toBeNull();
      expect(r.aviso).toMatch(/No hay turnos completados/);
      expect(r.costosFijosPeriodo).toBe(150000);
    });

    it('warns when each turno leaves no margin', async () => {
      prisma.turno.findMany = jest.fn().mockResolvedValue([
        { detalles: [detalle({ precioReal: 2000 })] },
      ]);

      const r = await service.getRentabilidad('2026-11-01', '2026-11-30');

      expect(r.margenPromedioPorTurno).toBe(-1000);
      expect(r.turnosParaCubrirFijosMes).toBeNull();
      expect(r.aviso).toMatch(/margen nulo o negativo/);
    });

    it('flags when no costs were loaded yet', async () => {
      prisma.costosNegocio.findUnique.mockResolvedValue(null);
      prisma.servicio.count = jest.fn().mockResolvedValue(0);
      prisma.turno.findMany = jest.fn().mockResolvedValue([]);

      const r = await service.getRentabilidad('2026-11-01', '2026-11-30');

      expect(r.costosConfigurados).toBe(false);
    });

    it('saves the costs as the single row', async () => {
      prisma.costosNegocio.upsert.mockResolvedValue({});
      prisma.costosNegocio.findUnique.mockResolvedValue({ costosFijosMensuales: 1, costoHoraTrabajo: 2 });

      const res = await service.updateCostos({ costosFijosMensuales: 1, costoHoraTrabajo: 2 });

      expect(prisma.costosNegocio.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, create: { id: 1, costosFijosMensuales: 1, costoHoraTrabajo: 2 } }),
      );
      expect(res).toEqual({ costosFijosMensuales: 1, costoHoraTrabajo: 2 });
    });
  });
});
