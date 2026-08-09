export interface FormaPago {
  idFormaPago: number;
  nombre: string;
  requiereComprobante: boolean;
  vigente: boolean;
}

export interface Pago {
  idPago: number;
  idTurno: number;
  idFormaPago: number;
  monto: number;
  comprobante?: string;
  fechaHora: string;
  formaPago?: FormaPago;
}

export interface MovimientoCaja {
  idMovimiento: number;
  fechaHora: string;
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  concepto: string;
  idFormaPago: number;
  idUsuario: string;
  idTurno?: number;
  formaPago?: FormaPago;
}

export interface TotalesCaja {
  fecha: string;
  ingresos: number;
  egresos: number;
  balance: number;
}

export interface CierreCaja {
  idCierre: number;
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalOtros: number;
  totalEsperado: number;
  totalReal: number;
  diferencia: number;
  idUsuarioCierra: string;
}

export interface CreatePagoRequest {
  idTurno: number;
  idFormaPago: number;
  monto: number;
  comprobante?: string;
}

export interface CreateMovimientoRequest {
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  concepto: string;
  idFormaPago: number;
  idTurno?: number;
}

export interface ConfirmarCierreRequest {
  idCierre: number;
  totalReal: number;
  idUsuario: string;
}
