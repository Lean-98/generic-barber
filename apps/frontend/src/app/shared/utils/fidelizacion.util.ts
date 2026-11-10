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

/**
 * Texto de la tarjeta "Beneficio de cumpleaños" del Club, armado desde la
 * configuración para que diga exactamente lo que se aplica. null si el
 * beneficio está apagado (se muestra el texto manual).
 */
export function textoBeneficioCumple(
  config: Pick<ConfiguracionNegocio, 'cumpleActivo' | 'cumpleDescuentoPorcentaje' | 'cumpleDiasAnticipacion' | 'cumpleDiasValidez'>,
): string | null {
  if (!config.cumpleActivo) return null;
  const pct = `${Number(config.cumpleDescuentoPorcentaje)}%`;
  const ant = config.cumpleDiasAnticipacion;
  const cuando = ant === 0 ? 'el mismo día' : ant === 1 ? 'el día anterior' : `${ant} días antes`;
  const vale =
    ant === 3 && config.cumpleDiasValidez === 7
      ? 'para reservar la semana de tu cumple'
      : `para reservar durante ${config.cumpleDiasValidez} ${config.cumpleDiasValidez === 1 ? 'día' : 'días'}`;
  return `${pct} de descuento ${vale}. Te mandamos tu código personal por mail ${cuando}: dejanos tu cumpleaños al reservar.`;
}
