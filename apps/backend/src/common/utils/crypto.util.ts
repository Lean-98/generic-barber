import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITMO = 'aes-256-gcm';
const IV_BYTES = 12;

function derivarClave(secreto: string): Buffer {
  // scrypt con salt fijo: alcanza para derivar una clave de 32 bytes a partir
  // de un secreto de longitud arbitraria (el env var puede no tener
  // exactamente 32 bytes). No es para hashear contraseñas de usuarios, solo
  // para tener una clave AES del tamaño correcto.
  return scryptSync(secreto, 'peluqueria-google-calendar', 32);
}

/**
 * Cifra un texto (ej. un token OAuth) para guardarlo en la base.
 * Formato de salida: "iv:authTag:ciphertext" en base64.
 */
export function encrypt(texto: string, secreto: string): string {
  const clave = derivarClave(secreto);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITMO, clave, iv);
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), cifrado.toString('base64')].join(':');
}

/**
 * Descifra un texto cifrado con `encrypt`.
 */
export function decrypt(valorCifrado: string, secreto: string): string {
  const [ivB64, authTagB64, cifradoB64] = valorCifrado.split(':');
  if (!ivB64 || !authTagB64 || !cifradoB64) {
    throw new Error('Valor cifrado con formato inválido');
  }

  const clave = derivarClave(secreto);
  const decipher = createDecipheriv(ALGORITMO, clave, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

  const descifrado = Buffer.concat([decipher.update(Buffer.from(cifradoB64, 'base64')), decipher.final()]);
  return descifrado.toString('utf8');
}
