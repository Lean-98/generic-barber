/**
 * Argentina no tiene horario de verano desde 2009: es UTC-3 todo el año.
 * Estas funciones calculan límites de "día" y horarios comerciales en hora
 * de Argentina usando solo aritmética UTC, sin depender de la zona horaria
 * configurada en el proceso de Node ni de librerías externas. Antes de esto,
 * distintos módulos mezclaban `setHours` (hora local del server) y
 * `setUTCHours`, así que "hoy" podía significar ventanas de tiempo distintas
 * según qué archivo hiciera la cuenta.
 */
const OFFSET_ARGENTINA_HORAS = 3; // UTC-3

/** Instante UTC que corresponde a las 00:00 en Argentina para la fecha calendario (UTC) dada. */
export function inicioDiaAr(fecha: Date): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(), OFFSET_ARGENTINA_HORAS, 0, 0, 0),
  );
}

/** Instante UTC que corresponde al último milisegundo del día en Argentina para la fecha dada. */
export function finDiaAr(fecha: Date): Date {
  return new Date(inicioDiaAr(fecha).getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Instante UTC que corresponde a una hora:minuto local de Argentina en la fecha calendario dada. */
export function horaArAUtc(fecha: Date, horaLocal: number, minutoLocal = 0): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(), horaLocal + OFFSET_ARGENTINA_HORAS, minutoLocal, 0, 0),
  );
}
