/**
 * Fecha "yyyy-MM-dd" en la zona horaria local del navegador (no UTC).
 * `Date.toISOString().split('T')[0]` usa el día en UTC: en Argentina
 * (UTC-3), entre las 21:00 y las 23:59 ya cayó en el día siguiente, lo que
 * hace que "hoy" apunte a mañana durante esas horas.
 */
export function fechaLocal(fecha: Date = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
