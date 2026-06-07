import {
  PendienteState,
  ConfirmadoState,
  EnAtencionState,
  FinalizadoState,
  PagadoState,
  CanceladoState,
  NoShowState,
  ITurnoState,
} from './turno-states';

/**
 * Factory para crear el estado correcto basado en el string de estado.
 * Parte del patrón State: delega el comportamiento al estado actual.
 */
export function getTurnoState(estado: string): ITurnoState {
  switch (estado) {
    case 'PENDIENTE':
      return new PendienteState();
    case 'CONFIRMADO':
      return new ConfirmadoState();
    case 'EN_ATENCION':
      return new EnAtencionState();
    case 'FINALIZADO':
      return new FinalizadoState();
    case 'PAGADO':
      return new PagadoState();
    case 'CANCELADO':
      return new CanceladoState();
    case 'NO_SHOW':
      return new NoShowState();
    default:
      throw new Error(`Estado de turno inválido: ${estado}`);
  }
}
