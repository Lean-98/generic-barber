import { ConfiguracionNegocio } from '../models/configuracion.model';

export interface ReglaClub {
  visitasRequeridas: number;
  /** Ya formateado, ej. "50%". */
  descuento: string;
}

/** La regla del programa de fidelización, o null si está apagado o incompleto. */
export function reglaClub(
  config: Pick<ConfiguracionNegocio, 'fidelizacionActiva' | 'fidelizacionVisitasRequeridas' | 'fidelizacionDescuentoPorcentaje'>,
): ReglaClub | null {
  if (!config.fidelizacionActiva || !config.fidelizacionVisitasRequeridas || config.fidelizacionDescuentoPorcentaje == null) {
    return null;
  }
  // El backend manda el Decimal como string ("50.00").
  return {
    visitasRequeridas: config.fidelizacionVisitasRequeridas,
    descuento: `${Number(config.fidelizacionDescuentoPorcentaje)}%`,
  };
}
