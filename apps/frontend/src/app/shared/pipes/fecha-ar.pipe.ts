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

const ZONA_AR = 'America/Argentina/Buenos_Aires';

@Pipe({
  name: 'fechaAr',
  standalone: true,
})
export class FechaArPipe implements PipeTransform {
  /**
   * `soloFecha`: para valores que representan un día calendario sin hora
   * (ej. `CierreCaja.fecha`, `Persona.fechaNacimiento`, columnas `@db.Date`
   * que Prisma siempre reconstruye en medianoche UTC) — se leen con los
   * getters UTC tal cual están guardados, sin aplicar ninguna conversión de
   * huso horario (si se usara la hora de Argentina, medianoche UTC caería
   * a las 21:00 del día anterior y el pipe le restaría un día al valor).
   *
   * Para el resto (con hora real), se fuerza explícitamente el huso de
   * Argentina con `Intl.DateTimeFormat` en vez de usar los getters locales
   * del navegador (`getHours`, `getDate`, etc.): esos dependen del huso
   * horario configurado en el dispositivo que ve la página, que no tiene
   * por qué ser Argentina (el panel puede abrirse desde cualquier lado), y
   * el negocio siempre opera en hora de Argentina sin importar quién mire.
   */
  transform(value: string | Date | null | undefined, formato: FechaArFormato = 'corta', soloFecha = false): string {
    const fecha = value instanceof Date ? value : value ? new Date(value) : null;
    if (!fecha || isNaN(fecha.getTime())) return '—';

    let dia: number;
    let mes: number;
    let anio: number;
    let diaSemana: number;
    let horaStr: string;

    if (soloFecha) {
      dia = fecha.getUTCDate();
      mes = fecha.getUTCMonth();
      anio = fecha.getUTCFullYear();
      diaSemana = fecha.getUTCDay();
      horaStr = '00:00';
    } else {
      const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: ZONA_AR,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(fecha);
      const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);

      anio = valor('year');
      mes = valor('month') - 1;
      dia = valor('day');
      // getUTCDay() sobre una fecha-calendario construida a partir de los
      // componentes ya resueltos en hora de Argentina: evita mapear nombres
      // de día de la semana que Intl devolvería en el locale pedido.
      diaSemana = new Date(Date.UTC(anio, mes, dia)).getUTCDay();
      horaStr = `${String(valor('hour') % 24).padStart(2, '0')}:${String(valor('minute')).padStart(2, '0')}`;
    }

    const diaPad = String(dia).padStart(2, '0');
    const mesPad = String(mes + 1).padStart(2, '0');

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
