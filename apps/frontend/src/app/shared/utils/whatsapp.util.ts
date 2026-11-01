export function whatsappLinkConMensaje(baseUrl: string, mensaje: string): string {
  const separador = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separador}text=${encodeURIComponent(mensaje)}`;
}

/**
 * Link de WhatsApp para escribirle a un cliente a partir del teléfono que
 * tiene cargado (se guarda solo con dígitos). Mismo criterio que el mail de
 * aviso de cancelación del backend: si ya trae el 54 se usa tal cual; si son
 * 10 dígitos (área + número) se arma como celular argentino (549...).
 * null si con ese número no se puede armar un link confiable.
 */
export function whatsappDeTelefono(telefono: string | null | undefined, mensaje?: string): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, '').replace(/^0+/, '');
  let numero: string | null = null;
  if (digitos.startsWith('54') && digitos.length >= 12) numero = digitos;
  else if (digitos.length === 10) numero = `549${digitos}`;
  if (!numero) return null;
  const base = `https://wa.me/${numero}`;
  return mensaje ? whatsappLinkConMensaje(base, mensaje) : base;
}
