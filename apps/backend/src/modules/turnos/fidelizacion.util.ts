import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Programa de fidelización: cada N visitas de servicios que "cuentan para
 * fidelización", la visita N (2N, 3N...) tiene el descuento. El descuento se
 * aplica de verdad al completar el turno (ver aplicarDescuentoFidelizacion
 * en turnos.service.ts); estas funciones solo calculan el progreso para
 * mostrárselo al cliente, con la misma forma de contar.
 */

type Db = Pick<PrismaClient, 'turnoDetalle'>;

export interface ConfigFidelizacion {
  fidelizacionActiva: boolean;
  fidelizacionVisitasRequeridas: number | null;
  fidelizacionDescuentoPorcentaje: Prisma.Decimal | number | string | null;
  fidelizacionFechaInicio: Date | null;
}

export interface ReglaFidelizacion {
  visitasRequeridas: number;
  descuentoPorcentaje: number;
  desde: Date | null;
}

/** Progreso de un turno ya reservado (mails de confirmación y recordatorio). */
export interface ProgresoTurno {
  visitasRequeridas: number;
  descuentoPorcentaje: number;
  /** Visita del ciclo actual que es este turno, de 1 a N. */
  visitaEnCiclo: number;
  conDescuento: boolean;
  /** El número cuenta turnos reservados antes de este que todavía no se hicieron. */
  cuentaTurnosPendientes: boolean;
}

/** Progreso de un cliente antes de reservar (página /reservar). */
export interface ProgresoCliente {
  visitasRequeridas: number;
  descuentoPorcentaje: number;
  /** Visitas hechas o reservadas en el ciclo actual, de 0 a N-1. */
  visitasEnCiclo: number;
  proximaConDescuento: boolean;
}

const ESTADOS_PENDIENTES = ['PENDIENTE', 'CONFIRMADO', 'EN_PROCESO'];

export function reglaFidelizacion(config: ConfigFidelizacion | null | undefined): ReglaFidelizacion | null {
  if (!config?.fidelizacionActiva || !config.fidelizacionVisitasRequeridas || config.fidelizacionDescuentoPorcentaje == null) {
    return null;
  }
  return {
    visitasRequeridas: config.fidelizacionVisitasRequeridas,
    descuentoPorcentaje: Number(config.fidelizacionDescuentoPorcentaje),
    desde: config.fidelizacionFechaInicio,
  };
}

/** Visitas que ya cuentan (turnos COMPLETADO). Es el mismo conteo que decide el descuento. */
export function contarVisitasCompletadas(db: Db, idPersona: number, desde: Date | null): Promise<number> {
  return db.turnoDetalle.count({
    where: {
      servicio: { cuentaParaFidelizacion: true },
      turno: {
        idPersona,
        estado: 'COMPLETADO',
        ...(desde ? { fechaHoraInicio: { gte: desde } } : {}),
      },
    },
  });
}

function contarVisitasPendientes(
  db: Db,
  idPersona: number,
  desde: Date | null,
  opciones: { antesDe?: Date; excluirTurno?: number } = {},
): Promise<number> {
  const fecha: Prisma.DateTimeFilter = {};
  if (desde) fecha.gte = desde;
  if (opciones.antesDe) fecha.lt = opciones.antesDe;
  return db.turnoDetalle.count({
    where: {
      servicio: { cuentaParaFidelizacion: true },
      turno: {
        idPersona,
        estado: { in: ESTADOS_PENDIENTES },
        ...(Object.keys(fecha).length ? { fechaHoraInicio: fecha } : {}),
        ...(opciones.excluirTurno ? { idTurno: { not: opciones.excluirTurno } } : {}),
      },
    },
  });
}

/**
 * null si el programa está apagado, la persona es empleado (usa el
 * descuento de personal) o el turno no tiene servicios que sumen.
 */
export async function progresoDeTurno(
  db: Db,
  config: ConfigFidelizacion | null | undefined,
  turno: { idTurno: number; idPersona: number; fechaHoraInicio: Date; aplicaDescuentoPersonal: boolean; serviciosQueSuman: number },
): Promise<ProgresoTurno | null> {
  const regla = reglaFidelizacion(config);
  if (!regla || turno.aplicaDescuentoPersonal || turno.serviciosQueSuman === 0) return null;

  const [completadas, pendientesAntes] = await Promise.all([
    contarVisitasCompletadas(db, turno.idPersona, regla.desde),
    contarVisitasPendientes(db, turno.idPersona, regla.desde, { antesDe: turno.fechaHoraInicio, excluirTurno: turno.idTurno }),
  ]);

  const N = regla.visitasRequeridas;
  const previas = completadas + pendientesAntes;
  let conDescuento = false;
  for (let i = 1; i <= turno.serviciosQueSuman; i++) {
    if ((previas + i) % N === 0) conDescuento = true;
  }
  const ultima = previas + turno.serviciosQueSuman;

  return {
    visitasRequeridas: N,
    descuentoPorcentaje: regla.descuentoPorcentaje,
    visitaEnCiclo: ((ultima - 1) % N) + 1,
    conDescuento,
    cuentaTurnosPendientes: pendientesAntes > 0,
  };
}

/** Cuenta lo hecho y lo ya reservado: el próximo turno que saque va después de todo eso. */
export async function progresoDeCliente(
  db: Db,
  config: ConfigFidelizacion | null | undefined,
  persona: { idPersona: number; aplicaDescuentoPersonal: boolean },
): Promise<ProgresoCliente | null> {
  const regla = reglaFidelizacion(config);
  if (!regla || persona.aplicaDescuentoPersonal) return null;

  const [completadas, pendientes] = await Promise.all([
    contarVisitasCompletadas(db, persona.idPersona, regla.desde),
    contarVisitasPendientes(db, persona.idPersona, regla.desde),
  ]);

  const N = regla.visitasRequeridas;
  const total = completadas + pendientes;
  return {
    visitasRequeridas: N,
    descuentoPorcentaje: regla.descuentoPorcentaje,
    visitasEnCiclo: total % N,
    proximaConDescuento: (total + 1) % N === 0,
  };
}
