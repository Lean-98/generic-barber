import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Token del link "Cancelar turno" que va en los mails al cliente.
 *
 * Formato: `<idTurno>.<firma>`, donde la firma es un HMAC-SHA256 del id con
 * una clave derivada de JWT_SECRET. No se guarda nada en la base: el mismo
 * turno siempre genera el mismo token, así el mail de confirmación y el de
 * recordatorio llevan el mismo link. Deja de servir solo porque, una vez
 * cancelado (o pasada la hora), el turno ya no se puede cancelar.
 *
 * Si se cambia JWT_SECRET, los links de los mails ya enviados dejan de andar.
 */
const PROPOSITO = 'cancelar-turno:v1';

function firmar(idTurno: number, secreto: string): string {
  return createHmac('sha256', `${PROPOSITO}:${secreto}`).update(String(idTurno)).digest('base64url');
}

export function generarTokenCancelacion(idTurno: number, secreto: string): string {
  return `${idTurno}.${firmar(idTurno, secreto)}`;
}

/** Devuelve el id del turno si el token es válido, o null si no lo es. */
export function verificarTokenCancelacion(token: string | undefined | null, secreto: string): number | null {
  if (!token || typeof token !== 'string') return null;

  const partes = token.split('.');
  if (partes.length !== 2 || !/^\d{1,10}$/.test(partes[0])) return null;

  const idTurno = Number(partes[0]);
  const esperada = Buffer.from(firmar(idTurno, secreto));
  const recibida = Buffer.from(partes[1]);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;

  return idTurno;
}

export function urlCancelacion(frontendUrl: string, idTurno: number, secreto: string): string {
  return `${frontendUrl.replace(/\/+$/, '')}/cancelar-turno?token=${generarTokenCancelacion(idTurno, secreto)}`;
}
