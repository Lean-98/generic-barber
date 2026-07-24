import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface IngresosPorDia {
  fecha: string;
  ingresos: number;
  egresos: number;
  balance: number;
}

export interface TurnosPorEstado {
  estado: string;
  cantidad: number;
}

export interface ServicioReporte {
  idServicio: number;
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface ClienteReporte {
  idPersona: number;
  nombre: string;
  apellido: string;
  cantidadTurnos: number;
  ingresos: number;
}

export interface IngresosPorFormaPago {
  idFormaPago: number;
  nombre: string;
  monto: number;
}

export interface ReporteResumen {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  totalTurnos: number;
  turnosPagados: number;
  turnosCancelados: number;
}

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  private getRangoFechas(desde?: string, hasta?: string): { inicio: Date; fin: Date } {
    const inicio = desde ? new Date(desde) : new Date();
    const fin = hasta ? new Date(hasta) : new Date();
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
  }

  async getResumen(desde?: string, hasta?: string): Promise<ReporteResumen> {
    const { inicio, fin } = this.getRangoFechas(desde, hasta);

    const [movimientos, turnos] = await Promise.all([
      this.prisma.movimientoCaja.findMany({
        where: { fechaHora: { gte: inicio, lte: fin } },
      }),
      this.prisma.turno.findMany({
        where: { fechaHoraInicio: { gte: inicio, lte: fin } },
        include: { pagos: true },
      }),
    ]);

    const totalIngresos = movimientos
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);
    const totalEgresos = movimientos
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    return {
      totalIngresos,
      totalEgresos,
      balance: totalIngresos - totalEgresos,
      totalTurnos: turnos.length,
      turnosPagados: turnos.filter((t) => t.pagos.length > 0).length,
      turnosCancelados: turnos.filter((t) => t.estado === 'CANCELADO' || t.estado === 'NO_SHOW').length,
    };
  }

  async getIngresosPorDia(desde?: string, hasta?: string): Promise<IngresosPorDia[]> {
    const { inicio, fin } = this.getRangoFechas(desde, hasta);

    const movimientos = await this.prisma.movimientoCaja.findMany({
      where: { fechaHora: { gte: inicio, lte: fin } },
      orderBy: { fechaHora: 'asc' },
    });

    const map = new Map<string, IngresosPorDia>();
    for (const m of movimientos) {
      const fecha = m.fechaHora.toISOString().split('T')[0];
      const actual = map.get(fecha) || { fecha, ingresos: 0, egresos: 0, balance: 0 };
      if (m.tipo === 'INGRESO') {
        actual.ingresos += Number(m.monto);
      } else {
        actual.egresos += Number(m.monto);
      }
      actual.balance = actual.ingresos - actual.egresos;
      map.set(fecha, actual);
    }

    return Array.from(map.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  async getTurnosPorEstado(desde?: string, hasta?: string): Promise<TurnosPorEstado[]> {
    const { inicio, fin } = this.getRangoFechas(desde, hasta);

    const turnos = await this.prisma.turno.groupBy({
      by: ['estado'],
      where: { fechaHoraInicio: { gte: inicio, lte: fin } },
      _count: { estado: true },
    });

    return turnos.map((t) => ({
      estado: t.estado,
      cantidad: t._count.estado,
    }));
  }

  async getServiciosMasSolicitados(desde?: string, hasta?: string, limite?: number): Promise<ServicioReporte[]> {
    const cantidad = Number.isNaN(limite) || limite === undefined || limite <= 0 ? 10 : limite;
    const { inicio, fin } = this.getRangoFechas(desde, hasta);

    const detalles = await this.prisma.turnoDetalle.findMany({
      where: {
        turno: {
          fechaHoraInicio: { gte: inicio, lte: fin },
          estado: { notIn: ['CANCELADO', 'NO_SHOW'] },
        },
      },
      include: { servicio: true },
    });

    const map = new Map<number, ServicioReporte>();
    for (const d of detalles) {
      const actual = map.get(d.idServicio) || {
        idServicio: d.idServicio,
        nombre: d.servicio.nombre,
        cantidad: 0,
        ingresos: 0,
      };
      actual.cantidad += d.cantidad;
      actual.ingresos += Number(d.precioReal) * d.cantidad;
      map.set(d.idServicio, actual);
    }

    return Array.from(map.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, cantidad);
  }

  async getTopClientes(desde?: string, hasta?: string, limite?: number): Promise<ClienteReporte[]> {
    const cantidad = Number.isNaN(limite) || limite === undefined || limite <= 0 ? 10 : limite;
    const { inicio, fin } = this.getRangoFechas(desde, hasta);

    const turnos = await this.prisma.turno.findMany({
      where: {
        fechaHoraInicio: { gte: inicio, lte: fin },
        estado: { notIn: ['CANCELADO', 'NO_SHOW'] },
      },
      include: {
        persona: true,
        detalles: true,
      },
    });

    const map = new Map<number, ClienteReporte>();
    for (const t of turnos) {
      const actual = map.get(t.idPersona) || {
        idPersona: t.idPersona,
        nombre: t.persona.nombre,
        apellido: t.persona.apellido,
        cantidadTurnos: 0,
        ingresos: 0,
      };
      actual.cantidadTurnos += 1;
      actual.ingresos += t.detalles.reduce((sum, d) => sum + Number(d.precioReal) * d.cantidad, 0);
      map.set(t.idPersona, actual);
    }

    return Array.from(map.values())
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, cantidad);
  }

  async getIngresosPorFormaPago(desde?: string, hasta?: string): Promise<IngresosPorFormaPago[]> {
    const { inicio, fin } = this.getRangoFechas(desde, hasta);

    const movimientos = await this.prisma.movimientoCaja.findMany({
      where: {
        fechaHora: { gte: inicio, lte: fin },
        tipo: 'INGRESO',
      },
      include: { formaPago: true },
    });

    const map = new Map<number, IngresosPorFormaPago>();
    for (const m of movimientos) {
      const id = m.idFormaPago;
      const actual = map.get(id) || {
        idFormaPago: id,
        nombre: m.formaPago.nombre,
        monto: 0,
      };
      actual.monto += Number(m.monto);
      map.set(id, actual);
    }

    return Array.from(map.values()).sort((a, b) => b.monto - a.monto);
  }
}
