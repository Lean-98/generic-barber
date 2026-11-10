import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Token del link "No quiero recibir promociones" de los mails de marketing.
 * Mismo esquema que el link de cancelación de turno (`<idPersona>.<firma>`,
 * HMAC con una clave derivada de JWT_SECRET, nada guardado en la base), con
 * otro propósito para que un token no sirva en lugar del otro.
 */
const PROPOSITO = 'baja-promociones:v1';

function firmar(idPersona: number, secreto: string): string {
  return createHmac('sha256', `${PROPOSITO}:${secreto}`).update(String(idPersona)).digest('base64url');
}

export function generarTokenBaja(idPersona: number, secreto: string): string {
  return `${idPersona}.${firmar(idPersona, secreto)}`;
}

/** El id de la persona si el token es válido; null si no. */
export function verificarTokenBaja(token: string | undefined | null, secreto: string): number | null {
  if (!token || typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 2 || !/^\d{1,10}$/.test(partes[0])) return null;

  const idPersona = Number(partes[0]);
  const esperada = Buffer.from(firmar(idPersona, secreto));
  const recibida = Buffer.from(partes[1]);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  return idPersona;
}

export function urlBaja(frontendUrl: string, idPersona: number, secreto: string): string {
  return `${frontendUrl.replace(/\/+$/, '')}/promociones?token=${generarTokenBaja(idPersona, secreto)}`;
}
