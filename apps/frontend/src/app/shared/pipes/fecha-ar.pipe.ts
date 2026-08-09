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
  transform(value: string | Date | null | undefined, formato: FechaArFormato = 'corta'): string {
    const fecha = value instanceof Date ? value : value ? new Date(value) : null;
    if (!fecha || isNaN(fecha.getTime())) return '—';

    const dia = fecha.getDate();
    const diaPad = String(dia).padStart(2, '0');
    const mesPad = String(fecha.getMonth() + 1).padStart(2, '0');
    const mes = fecha.getMonth();
    const anio = fecha.getFullYear();
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
        return `${DIAS_LARGOS[fecha.getDay()]} ${dia} de ${MESES_LARGOS[mes]} de ${anio}`;
      case 'diaMes':
        return `${diaPad} ${MESES_CORTOS[mes]}`;
      case 'diaMesAnio':
        return `${diaPad} ${MESES_CORTOS[mes]} ${anio}`;
      case 'diaNumero':
        return `${dia}`;
      case 'diaSemana':
        return `${DIAS_LARGOS[fecha.getDay()]} ${dia}`;
      default:
        return `${diaPad}/${mesPad}/${anio}`;
    }
  }
}
