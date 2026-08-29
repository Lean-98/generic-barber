import { Pipe, PipeTransform } from '@angular/core';

/** RFC 5322 simplificado: usuario@dominio.tld, sin espacios ni arrobas de más. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Pipe({
  name: 'emailValido',
  standalone: true,
})
export class EmailValidoPipe implements PipeTransform {
  transform(value: string | null | undefined): boolean {
    return !!value && EMAIL_REGEX.test(value.trim());
  }
}
