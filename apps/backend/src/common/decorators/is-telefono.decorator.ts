import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, Matches } from 'class-validator';

/**
 * Deja el teléfono solo con dígitos, para que se guarde siempre igual sin
 * importar cómo lo escribió la persona ("+54 11 1234-5678", "0351 339-3667").
 * Saca los ceros iniciales (el 0 de larga distancia argentino), así
 * "0351..." y "351..." quedan iguales y el link de WhatsApp sale bien.
 * Vacío → null (borra el teléfono).
 */
export function normalizarTelefono(valor: unknown): string | null | undefined {
  if (valor === undefined || valor === null) return valor as null | undefined;
  if (typeof valor !== 'string') return valor as any;
  // Con letras no es un teléfono: se deja tal cual para que la validación lo
  // rechace con un mensaje, en vez de descartarlo en silencio.
  if (/\p{L}/u.test(valor)) return valor;
  const digitos = valor.replace(/\D/g, '').replace(/^0+/, '');
  return digitos === '' ? null : digitos;
}

export const TELEFONO_REGEX = /^\d{8,15}$/;
export const TELEFONO_MENSAJE = 'El teléfono debe tener entre 8 y 15 números, con código de área (ej: 351 1234567)';

/** Teléfono opcional: se normaliza a dígitos y se valida que queden entre 8 y 15. */
export function IsTelefono() {
  return applyDecorators(
    Transform(({ value }) => normalizarTelefono(value)),
    IsOptional(),
    Matches(TELEFONO_REGEX, { message: TELEFONO_MENSAJE }),
  );
}
