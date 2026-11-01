/**
 * Argentina no tiene horario de verano desde 2009: es UTC-3 todo el año.
 *
 * Construye un instante ISO 8601 con el offset explícito a partir de una
 * fecha ("yyyy-MM-dd") y una hora ("HH:mm") que el usuario ingresó pensando
 * en hora de Argentina. Sin el offset explícito, un string como
 * "2026-11-03T10:00:00" es ambiguo: el `Date` nativo lo interpreta como hora
 * LOCAL del entorno que lo evalúa — el navegador si se parsea ahí, o el
 * sistema operativo del servidor si el string llega crudo al backend
 * (`new Date(dto.fechaHoraInicio)`). El backend está hosteado en Canadá
 * pero el negocio opera en hora de Argentina, así que hace falta fijar el
 * offset acá para que el instante resultante sea el mismo sin importar
 * dónde corra el código que lo lea.
 */
export function fechaHoraArAIso(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00-03:00`;
}
