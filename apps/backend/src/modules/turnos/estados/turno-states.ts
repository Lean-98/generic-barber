import { BadRequestException } from '@nestjs/common';

/**
 * Interfaz del patrón State para Turnos.
 * Cada estado implementa estas operaciones y define qué transiciones son válidas.
 */
export interface ITurnoState {
  confirmar(): void;
  cancelar(): void;
  iniciarAtencion(): void;
  finalizar(): void;
  registrarPago(): void;
  marcarNoShow(): void;
  getEstado(): string;
}

// Estado: PENDIENTE
export class PendienteState implements ITurnoState {
  confirmar() {
    // Permitido
  }
  cancelar() {
    // Permitido
  }
  iniciarAtencion() {
    throw new BadRequestException('No se puede iniciar atención: el turno está PENDIENTE');
  }
  finalizar() {
    throw new BadRequestException('No se puede finalizar: el turno está PENDIENTE');
  }
  registrarPago() {
    throw new BadRequestException('No se puede registrar pago: el turno está PENDIENTE');
  }
  marcarNoShow() {
    throw new BadRequestException('No se puede marcar no-show: el turno está PENDIENTE');
  }
  getEstado() { return 'PENDIENTE'; }
}

// Estado: CONFIRMADO
export class ConfirmadoState implements ITurnoState {
  confirmar() {
    throw new BadRequestException('El turno ya está CONFIRMADO');
  }
  cancelar() {
    // Permitido
  }
  iniciarAtencion() {
    // Permitido
  }
  finalizar() {
    throw new BadRequestException('No se puede finalizar: el turno está CONFIRMADO (inicie atención primero)');
  }
  registrarPago() {
    throw new BadRequestException('No se puede registrar pago: el turno está CONFIRMADO');
  }
  marcarNoShow() {
    // Permitido
  }
  getEstado() { return 'CONFIRMADO'; }
}

// Estado: EN_ATENCION
export class EnAtencionState implements ITurnoState {
  confirmar() {
    throw new BadRequestException('El turno ya está EN_ATENCION');
  }
  cancelar() {
    throw new BadRequestException('No se puede cancelar: el turno está EN_ATENCION');
  }
  iniciarAtencion() {
    throw new BadRequestException('El turno ya está EN_ATENCION');
  }
  finalizar() {
    // Permitido
  }
  registrarPago() {
    throw new BadRequestException('No se puede registrar pago: el turno está EN_ATENCION (finalice primero)');
  }
  marcarNoShow() {
    throw new BadRequestException('No se puede marcar no-show: el turno está EN_ATENCION');
  }
  getEstado() { return 'EN_ATENCION'; }
}

// Estado: FINALIZADO
export class FinalizadoState implements ITurnoState {
  confirmar() {
    throw new BadRequestException('El turno ya está FINALIZADO');
  }
  cancelar() {
    throw new BadRequestException('No se puede cancelar: el turno está FINALIZADO');
  }
  iniciarAtencion() {
    throw new BadRequestException('El turno ya está FINALIZADO');
  }
  finalizar() {
    throw new BadRequestException('El turno ya está FINALIZADO');
  }
  registrarPago() {
    // Permitido
  }
  marcarNoShow() {
    throw new BadRequestException('No se puede marcar no-show: el turno está FINALIZADO');
  }
  getEstado() { return 'FINALIZADO'; }
}

// Estado: PAGADO
export class PagadoState implements ITurnoState {
  confirmar() {
    throw new BadRequestException('El turno ya está PAGADO');
  }
  cancelar() {
    throw new BadRequestException('No se puede cancelar: el turno está PAGADO');
  }
  iniciarAtencion() {
    throw new BadRequestException('El turno ya está PAGADO');
  }
  finalizar() {
    throw new BadRequestException('El turno ya está PAGADO');
  }
  registrarPago() {
    throw new BadRequestException('El turno ya está PAGADO');
  }
  marcarNoShow() {
    throw new BadRequestException('No se puede marcar no-show: el turno está PAGADO');
  }
  getEstado() { return 'PAGADO'; }
}

// Estado: CANCELADO
export class CanceladoState implements ITurnoState {
  confirmar() {
    throw new BadRequestException('No se puede confirmar: el turno está CANCELADO');
  }
  cancelar() {
    throw new BadRequestException('El turno ya está CANCELADO');
  }
  iniciarAtencion() {
    throw new BadRequestException('No se puede iniciar atención: el turno está CANCELADO');
  }
  finalizar() {
    throw new BadRequestException('No se puede finalizar: el turno está CANCELADO');
  }
  registrarPago() {
    throw new BadRequestException('No se puede registrar pago: el turno está CANCELADO');
  }
  marcarNoShow() {
    throw new BadRequestException('No se puede marcar no-show: el turno está CANCELADO');
  }
  getEstado() { return 'CANCELADO'; }
}

// Estado: NO_SHOW
export class NoShowState implements ITurnoState {
  confirmar() {
    throw new BadRequestException('No se puede confirmar: el turno está NO_SHOW');
  }
  cancelar() {
    throw new BadRequestException('No se puede cancelar: el turno está NO_SHOW');
  }
  iniciarAtencion() {
    throw new BadRequestException('No se puede iniciar atención: el turno está NO_SHOW');
  }
  finalizar() {
    throw new BadRequestException('No se puede finalizar: el turno está NO_SHOW');
  }
  registrarPago() {
    throw new BadRequestException('No se puede registrar pago: el turno está NO_SHOW');
  }
  marcarNoShow() {
    throw new BadRequestException('El turno ya está NO_SHOW');
  }
  getEstado() { return 'NO_SHOW'; }
}
