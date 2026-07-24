export enum TurnoEstado {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADO = 'CONFIRMADO',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
  NO_SHOW = 'NO_SHOW',
}

export const TURNO_ESTADOS_VALIDOS = [
  TurnoEstado.PENDIENTE,
  TurnoEstado.CONFIRMADO,
  TurnoEstado.EN_PROCESO,
  TurnoEstado.COMPLETADO,
  TurnoEstado.CANCELADO,
  TurnoEstado.NO_SHOW,
] as const;

export type TurnoEstadoString = (typeof TURNO_ESTADOS_VALIDOS)[number];
