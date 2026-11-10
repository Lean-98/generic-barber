/**
 * Cuentas de fechas del beneficio de cumpleaños. Todo trabaja con
 * fechas-calendario (medianoche UTC del día de Argentina, ver
 * fecha-ar.util.ts): la hora no importa, solo el día.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * DIA_MS);
}

function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/** El cumple en ese año. El 29/02 se festeja el 28/02 en los años no bisiestos. */
export function cumpleEnAnio(nacimiento: Date, anio: number): Date {
  const mes = nacimiento.getUTCMonth();
  let dia = nacimiento.getUTCDate();
  if (mes === 1 && dia === 29 && !esBisiesto(anio)) dia = 28;
  return new Date(Date.UTC(anio, mes, dia));
}

/** El próximo cumple desde hoy (hoy incluido). */
export function proximoCumple(nacimiento: Date, hoy: Date): Date {
  const esteAnio = cumpleEnAnio(nacimiento, hoy.getUTCFullYear());
  return esteAnio >= hoy ? esteAnio : cumpleEnAnio(nacimiento, hoy.getUTCFullYear() + 1);
}

export interface EnvioCumple {
  cumple: Date;
  /** Primer y último día (inclusive) en que se puede reservar con el cupón. */
  desde: Date;
  hasta: Date;
}

/**
 * Si hoy corresponde mandar el cupón de este cumple: desde el día del aviso
 * (cumple - anticipación) hasta el cumple mismo, así un día sin correr el
 * proceso, o un cumpleaños cargado tarde, no se pierden. La vigencia sale
 * del día del aviso (con 3 y 7: del cumple -3 al cumple +3); si se manda
 * tarde, arranca hoy.
 */
export function envioCorrespondiente(nacimiento: Date, hoy: Date, diasAnticipacion: number, diasValidez: number): EnvioCumple | null {
  const cumple = proximoCumple(nacimiento, hoy);
  const diaAviso = sumarDias(cumple, -diasAnticipacion);
  if (diaAviso > hoy) return null;

  const hasta = sumarDias(diaAviso, diasValidez - 1);
  return { cumple, desde: hoy, hasta: hasta < hoy ? hoy : hasta };
}

/** Código del cupón: CUMPLE-<NOMBRE>-<4 al azar>, siempre dentro de [A-Z0-9_-]{3,30}. */
export function codigoCumple(nombre: string, azar: () => string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
  return limpio ? `CUMPLE-${limpio}-${azar()}` : `CUMPLE-${azar()}${azar()}`;
}

/** "2026-03-15" → "15/03". */
export function diaMes(fecha: Date): string {
  return `${String(fecha.getUTCDate()).padStart(2, '0')}/${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}
