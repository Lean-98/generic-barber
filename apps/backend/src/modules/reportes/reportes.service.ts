import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { inicioDiaAr, finDiaAr, hoyAr } from '../../common/utils/fecha-ar.util';

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

/** Cliente que dejó de venir (o que nunca completó un turno), para contactarlo. */
export interface ClienteInactivo {
  idPersona: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  mail: string | null;
  /** Último turno COMPLETADO; null si nunca completó uno. */
  ultimaVisita: Date | null;
  diasSinVenir: number | null;
  visitas: number;
  /** Fecha de alta del cliente (útil para "nunca vinieron"). */
  registradoEl: Date;
}

export interface CostosNegocioValores {
  costosFijosMensuales: number;
  costoHoraTrabajo: number;
}

export interface ReporteRentabilidad {
  /** false si todavía no se cargó ningún costo: el resto de los números no dicen nada. */
  costosConfigurados: boolean;
  dias: number;
  turnosCompletados: number;
  /** Lo cobrado por servicios de turnos completados (ya con descuentos). */
  ingresosServicios: number;
  /** Insumos + horas de trabajo de esos turnos. */
  costosVariables: number;
  margenContribucion: number;
  /** Costos fijos mensuales proporcionales a los días del período (mes de 30 días). */
  costosFijosPeriodo: number;
  resultado: number;
  /** Lo que se dejó de cobrar por el programa de fidelización. */
  costoFidelizacion: number;
  serviciosConFidelizacion: number;
  /** Lo que se dejó de cobrar por cupones de descuento. */
  costoCupones: number;
  serviciosConCupon: number;
  /** La parte de costoCupones que fue por cupones de cumpleaños. */
  costoCuponesCumpleanos: number;
  margenPromedioPorTurno: number | null;
  turnosParaCubrirFijosMes: number | null;
  turnosParaCubrirFijosPeriodo: number | null;
  turnosFaltantesPeriodo: number | null;
  /** Servicios vigentes sin costo de insumos cargado (para avisar que el cálculo puede estar incompleto). */
  serviciosSinCosto: number;
  /** Explicación cuando no se puede calcular el punto de equilibrio. */
  aviso: string | null;
}

export interface ReporteCumpleanos {
  /** Cupones de cumpleaños generados (y mandados) en el período. */
  enviados: number;
  /** De esos, cuántos se usaron para reservar (turno no cancelado). */
  usados: number;
  /** usados / enviados, en %; null sin cupones. */
  porcentajeUso: number | null;
  recordatoriosEnviados: number;
  /** Turnos completados con esos cupones. */
  turnosCompletados: number;
  /** Lo cobrado por los servicios de esos turnos (ya con el descuento). */
  facturado: number;
  /** Lo que se dejó de cobrar por el cupón. */
  descuentoOtorgado: number;
}

const DIAS_MES_REFERENCIA = 30;
const LIMITE_CLIENTES_INACTIVOS = 300;
const ESTADOS_TURNO_FUTURO = ['PENDIENTE', 'CONFIRMADO'];
const MS_DIA = 24 * 60 * 60 * 1000;

const redondear = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  private getRangoFechas(desde?: string, hasta?: string): { inicio: Date; fin: Date } {
    const inicio = inicioDiaAr(desde ? new Date(desde) : hoyAr());
    const fin = finDiaAr(hasta ? new Date(hasta) : hoyAr());
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

  // ─── Clientes inactivos ───

  /**
   * Clientes cuyo último turno completado fue hace más de `dias` días. Se
   * excluye a quien ya tiene un turno reservado a futuro (no hace falta
   * escribirle), al personal (usuarios del panel) y a los marcados como
   * empleados. Ordenados primero por los que más veces vinieron: son los
   * que más vale la pena recuperar.
   */
  async getClientesInactivos(dias: number, ahora = new Date()): Promise<ClienteInactivo[]> {
    const limite = new Date(ahora.getTime() - dias * MS_DIA);
    const { visitas, conTurnoFuturo, personas } = await this.datosParaInactivos(ahora);

    return personas
      .filter((p) => {
        const v = visitas.get(p.idPersona);
        return v && v.ultima < limite && !conTurnoFuturo.has(p.idPersona);
      })
      .map((p) => {
        const v = visitas.get(p.idPersona)!;
        return this.aClienteInactivo(p, v.ultima, v.cantidad, ahora);
      })
      .sort((a, b) => b.visitas - a.visitas || b.ultimaVisita!.getTime() - a.ultimaVisita!.getTime())
      .slice(0, LIMITE_CLIENTES_INACTIVOS);
  }

  /** Clientes registrados que nunca completaron un turno ni tienen uno reservado. Los más recientes primero. */
  async getClientesSinVisitas(ahora = new Date()): Promise<ClienteInactivo[]> {
    const { visitas, conTurnoFuturo, personas } = await this.datosParaInactivos(ahora);

    return personas
      .filter((p) => !visitas.has(p.idPersona) && !conTurnoFuturo.has(p.idPersona))
      .map((p) => this.aClienteInactivo(p, null, 0, ahora))
      .sort((a, b) => b.registradoEl.getTime() - a.registradoEl.getTime())
      .slice(0, LIMITE_CLIENTES_INACTIVOS);
  }

  private async datosParaInactivos(ahora: Date) {
    const [completados, futuros, personas] = await Promise.all([
      this.prisma.turno.groupBy({
        by: ['idPersona'],
        where: { estado: 'COMPLETADO' },
        _max: { fechaHoraInicio: true },
        _count: { _all: true },
      }),
      this.prisma.turno.findMany({
        where: { estado: { in: ESTADOS_TURNO_FUTURO }, fechaHoraInicio: { gte: ahora } },
        select: { idPersona: true },
        distinct: ['idPersona'],
      }),
      this.prisma.persona.findMany({
        where: { aplicaDescuentoPersonal: false, usuarioWeb: { is: null } },
        select: { idPersona: true, nombre: true, apellido: true, telefono: true, mail: true, createdAt: true },
      }),
    ]);

    const visitas = new Map<number, { ultima: Date; cantidad: number }>();
    for (const c of completados) {
      if (c._max.fechaHoraInicio) {
        visitas.set(c.idPersona, { ultima: c._max.fechaHoraInicio, cantidad: c._count._all });
      }
    }
    const conTurnoFuturo = new Set(futuros.map((t) => t.idPersona));
    return { visitas, conTurnoFuturo, personas };
  }

  private aClienteInactivo(
    p: { idPersona: number; nombre: string; apellido: string; telefono: string | null; mail: string | null; createdAt: Date },
    ultimaVisita: Date | null,
    visitas: number,
    ahora: Date,
  ): ClienteInactivo {
    return {
      idPersona: p.idPersona,
      nombre: p.nombre,
      apellido: p.apellido,
      telefono: p.telefono,
      mail: p.mail,
      ultimaVisita,
      diasSinVenir: ultimaVisita ? Math.floor((ahora.getTime() - ultimaVisita.getTime()) / MS_DIA) : null,
      visitas,
      registradoEl: p.createdAt,
    };
  }

  // ─── Rentabilidad ───

  async getCostos(): Promise<CostosNegocioValores> {
    const costos = await this.prisma.costosNegocio.findUnique({ where: { id: 1 } });
    return {
      costosFijosMensuales: Number(costos?.costosFijosMensuales ?? 0),
      costoHoraTrabajo: Number(costos?.costoHoraTrabajo ?? 0),
    };
  }

  async updateCostos(valores: CostosNegocioValores): Promise<CostosNegocioValores> {
    await this.prisma.costosNegocio.upsert({
      where: { id: 1 },
      update: valores,
      create: { id: 1, ...valores },
    });
    return this.getCostos();
  }

  /**
   * Margen y punto de equilibrio del período, con el mismo modelo del informe
   * de Turnero: costo de cada servicio = insumos + costo de la hora × duración.
   * Los egresos de caja NO se restan acá para no contar dos veces lo mismo
   * (alquiler o insumos cargados como egreso y también como costo).
   */
  /**
   * Cupones de cumpleaños generados en el período y qué pasó con ellos.
   * Cuenta por fecha de envío (creación del cupón): lo facturado es de esos
   * cupones aunque el turno haya caído después.
   */
  async getCumpleanos(desde?: string, hasta?: string): Promise<ReporteCumpleanos> {
    const { inicio, fin } = this.getRangoFechas(desde, hasta);
    const cupones = await this.prisma.cupon.findMany({
      where: { origen: 'CUMPLEANOS', createdAt: { gte: inicio, lte: fin } },
      include: {
        turnos: {
          where: { estado: { not: 'CANCELADO' } },
          include: { detalles: true },
        },
      },
    });

    let usados = 0;
    let turnosCompletados = 0;
    let facturado = 0;
    let descuentoOtorgado = 0;
    for (const cupon of cupones) {
      if (cupon.turnos.length > 0) usados++;
      for (const turno of cupon.turnos) {
        if (turno.estado !== 'COMPLETADO') continue;
        turnosCompletados++;
        for (const d of turno.detalles) {
          const bruto = Number(d.precioReal) * d.cantidad;
          const descuento = bruto * (Number(d.descuentoPorcentaje) / 100);
          facturado += bruto - descuento;
          if (d.descuentoMotivo === 'CUPON') descuentoOtorgado += descuento;
        }
      }
    }

    return {
      enviados: cupones.length,
      usados,
      porcentajeUso: cupones.length ? Math.round((usados / cupones.length) * 100) : null,
      recordatoriosEnviados: cupones.filter((c) => c.recordatorioEnviadoEn).length,
      turnosCompletados,
      facturado: redondear(facturado),
      descuentoOtorgado: redondear(descuentoOtorgado),
    };
  }

  async getRentabilidad(desde?: string, hasta?: string): Promise<ReporteRentabilidad> {
    const { inicio, fin } = this.getRangoFechas(desde, hasta);
    const dias = Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / MS_DIA));

    const [costos, turnos, serviciosSinCosto] = await Promise.all([
      this.getCostos(),
      this.prisma.turno.findMany({
        where: { estado: 'COMPLETADO', fechaHoraInicio: { gte: inicio, lte: fin } },
        include: { detalles: { include: { servicio: true } }, cupon: { select: { origen: true } } },
      }),
      this.prisma.servicio.count({ where: { vigente: true, costoInsumos: 0 } }),
    ]);

    let ingresosServicios = 0;
    let costosVariables = 0;
    let costoFidelizacion = 0;
    let serviciosConFidelizacion = 0;
    let costoCupones = 0;
    let serviciosConCupon = 0;
    let costoCuponesCumpleanos = 0;

    for (const turno of turnos) {
      for (const d of turno.detalles) {
        const bruto = Number(d.precioReal) * d.cantidad;
        const descuento = bruto * (Number(d.descuentoPorcentaje) / 100);
        ingresosServicios += bruto - descuento;
        costosVariables +=
          (Number(d.servicio.costoInsumos) + costos.costoHoraTrabajo * (d.servicio.duracionMinutos / 60)) * d.cantidad;
        if (d.descuentoMotivo === 'FIDELIZACION') {
          costoFidelizacion += descuento;
          serviciosConFidelizacion += d.cantidad;
        } else if (d.descuentoMotivo === 'CUPON') {
          costoCupones += descuento;
          serviciosConCupon += d.cantidad;
          if (turno.cupon?.origen === 'CUMPLEANOS') costoCuponesCumpleanos += descuento;
        }
      }
    }

    const costosConfigurados =
      costos.costosFijosMensuales > 0 ||
      costos.costoHoraTrabajo > 0 ||
      (await this.prisma.servicio.count({ where: { costoInsumos: { gt: 0 } } })) > 0;

    const margenContribucion = ingresosServicios - costosVariables;
    const costosFijosPeriodo = (costos.costosFijosMensuales * dias) / DIAS_MES_REFERENCIA;
    const turnosCompletados = turnos.length;

    // Punto de equilibrio: cuántos turnos hacen falta para que el margen que
    // deja cada uno cubra los costos fijos. Sin turnos no hay promedio (sería
    // dividir por cero) y con margen <= 0 no existe punto de equilibrio.
    let margenPromedioPorTurno: number | null = null;
    let turnosParaCubrirFijosMes: number | null = null;
    let turnosParaCubrirFijosPeriodo: number | null = null;
    let turnosFaltantesPeriodo: number | null = null;
    let aviso: string | null = null;

    if (turnosCompletados === 0) {
      aviso = 'No hay turnos completados en este período, así que todavía no se puede calcular el punto de equilibrio.';
    } else {
      margenPromedioPorTurno = margenContribucion / turnosCompletados;
      if (margenPromedioPorTurno <= 0) {
        aviso = 'Con los costos cargados, cada turno deja un margen nulo o negativo: no hay cantidad de turnos que cubra los costos fijos. Revisá precios o costos.';
      } else {
        turnosParaCubrirFijosMes = Math.ceil(costos.costosFijosMensuales / margenPromedioPorTurno);
        turnosParaCubrirFijosPeriodo = Math.ceil(costosFijosPeriodo / margenPromedioPorTurno);
        turnosFaltantesPeriodo = Math.max(0, turnosParaCubrirFijosPeriodo - turnosCompletados);
      }
    }

    return {
      costosConfigurados,
      dias,
      turnosCompletados,
      ingresosServicios: redondear(ingresosServicios),
      costosVariables: redondear(costosVariables),
      margenContribucion: redondear(margenContribucion),
      costosFijosPeriodo: redondear(costosFijosPeriodo),
      resultado: redondear(margenContribucion - costosFijosPeriodo),
      costoFidelizacion: redondear(costoFidelizacion),
      serviciosConFidelizacion,
      costoCupones: redondear(costoCupones),
      serviciosConCupon,
      costoCuponesCumpleanos: redondear(costoCuponesCumpleanos),
      margenPromedioPorTurno: margenPromedioPorTurno === null ? null : redondear(margenPromedioPorTurno),
      turnosParaCubrirFijosMes,
      turnosParaCubrirFijosPeriodo,
      turnosFaltantesPeriodo,
      serviciosSinCosto,
      aviso,
    };
  }
}
