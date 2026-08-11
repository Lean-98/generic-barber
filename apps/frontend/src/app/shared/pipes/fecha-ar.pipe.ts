import { Pipe, PipeTransform } from '@angular/core';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export type FechaArFormato =
  | 'corta'       // 09/08/2026
  | 'cortaHora'   // 09/08/2026 08:00
  | 'hora'        // 08:00
  | 'media'       // 9 ago 2026
  | 'completa'    // domingo 9 de agosto de 2026
  | 'diaMes'      // 09 ago
  | 'diaMesAnio'  // 09 ago 2026
  | 'diaNumero'   // 9
  | 'diaSemana';  // domingo 9

@Pipe({
  name: 'fechaAr',
  standalone: true,
})
export class FechaArPipe implements PipeTransform {
  /**
   * `soloFecha`: para valores que representan un día calendario sin hora
   * (ej. `CierreCaja.fecha`, `Persona.fechaNacimiento`, columnas `@db.Date`
   * que Prisma siempre reconstruye en medianoche UTC). Con los getters
   * locales, medianoche UTC cae a las 21:00 del día anterior en Argentina
   * (UTC-3) y el pipe le resta un día al valor. Los getters UTC devuelven
   * el día tal cual está guardado, sin aplicar conversión de huso horario.
   */
  transform(value: string | Date | null | undefined, formato: FechaArFormato = 'corta', soloFecha = false): string {
    const fecha = value instanceof Date ? value : value ? new Date(value) : null;
    if (!fecha || isNaN(fecha.getTime())) return '—';

    const dia = soloFecha ? fecha.getUTCDate() : fecha.getDate();
    const mes = soloFecha ? fecha.getUTCMonth() : fecha.getMonth();
    const anio = soloFecha ? fecha.getUTCFullYear() : fecha.getFullYear();
    const diaSemana = soloFecha ? fecha.getUTCDay() : fecha.getDay();
    const diaPad = String(dia).padStart(2, '0');
    const mesPad = String(mes + 1).padStart(2, '0');
    const horaStr = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;

    switch (formato) {
      case 'corta':
        return `${diaPad}/${mesPad}/${anio}`;
      case 'cortaHora':
        return `${diaPad}/${mesPad}/${anio} ${horaStr}`;
      case 'hora':
        return horaStr;
      case 'media':
        return `${dia} ${MESES_CORTOS[mes]} ${anio}`;
      case 'completa':
        return `${DIAS_LARGOS[diaSemana]} ${dia} de ${MESES_LARGOS[mes]} de ${anio}`;
      case 'diaMes':
        return `${diaPad} ${MESES_CORTOS[mes]}`;
      case 'diaMesAnio':
        return `${diaPad} ${MESES_CORTOS[mes]} ${anio}`;
      case 'diaNumero':
        return `${dia}`;
      case 'diaSemana':
        return `${DIAS_LARGOS[diaSemana]} ${dia}`;
      default:
        return `${diaPad}/${mesPad}/${anio}`;
    }
  }
}
