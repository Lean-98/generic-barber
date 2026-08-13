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
const OFFSET_ARGENTINA_MS = OFFSET_ARGENTINA_HORAS * 60 * 60 * 1000;

/**
 * Instante UTC que corresponde a las 00:00 en Argentina para la fecha
 * calendario (UTC) dada. `fecha` debe ser una fecha-calendario (ej. la
 * medianoche UTC que resulta de parsear un string `YYYY-MM-DD`), no un
 * instante en vivo: sus componentes UTC se toman tal cual como el día
 * calendario buscado. Para "hoy" en Argentina a partir de un instante real
 * (`new Date()`), usar `hoyAr()` primero — ver su comentario.
 */
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

/**
 * Fecha-calendario (medianoche UTC) del "hoy" de Argentina, calculada a
 * partir del instante real actual. Entre las 21:00 y las 23:59 hora
 * Argentina la fecha UTC ya rodó al día siguiente, así que no alcanza con
 * leer `new Date()` directamente: hay que restar el offset para obtener el
 * día calendario real en Argentina antes de usarlo con `inicioDiaAr`/`finDiaAr`.
 */
export function hoyAr(): Date {
  const ahoraEnHoraAr = new Date(Date.now() - OFFSET_ARGENTINA_MS);
  return new Date(Date.UTC(ahoraEnHoraAr.getUTCFullYear(), ahoraEnHoraAr.getUTCMonth(), ahoraEnHoraAr.getUTCDate()));
}
