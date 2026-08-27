export function whatsappLinkConMensaje(baseUrl: string, mensaje: string): string {
  const separador = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separador}text=${encodeURIComponent(mensaje)}`;
}
