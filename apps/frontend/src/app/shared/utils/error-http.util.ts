/**
 * Mensaje legible de un error HTTP del backend. Los errores de validación de
 * NestJS traen `message` como array (uno por campo); el resto, como string.
 */
export function mensajeDeErrorHttp(err: any, porDefecto: string): string {
  const message = err?.error?.message;
  if (Array.isArray(message) && message.length > 0) return message.join('. ');
  if (typeof message === 'string' && message.trim()) return message;
  return porDefecto;
}
