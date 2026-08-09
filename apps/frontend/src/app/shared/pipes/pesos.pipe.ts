import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pesos',
  standalone: true,
})
export class PesosPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  transform(value: number | string | null | undefined): string {
    const num = typeof value === 'string' ? Number(value) : value;
    if (num === null || num === undefined || isNaN(num)) {
      return `$${this.formatter.format(0)}`;
    }
    const formatted = this.formatter.format(Math.abs(num));
    return num < 0 ? `-$${formatted}` : `$${formatted}`;
  }
}
