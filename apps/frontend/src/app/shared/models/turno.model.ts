export interface Turno {
  idTurno: number;
  idPersona: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  estado: string;
  observacion?: string;
  fechaCreacion: string;
  googleEventId?: string;
  /** Forma de pago que el cliente eligió al reservar online (sugerencia, no el pago real). */
  idFormaPagoPreferida?: number;
  persona?: {
    nombre: string;
    apellido: string;
  };
  detalles?: TurnoDetalle[];
  pagos?: any[];
}

export interface TurnoDetalle {
  idTurnoDetalle: number;
  idTurno: number;
  idServicio: number;
  precioReal: number;
  cantidad: number;
  descuentoPorcentaje: number;
  descuentoMotivo?: string | null;
  servicio?: ServicioRef;
}

export interface ServicioRef {
  idServicio: number;
  nombre: string;
  duracionMinutos: number;
}

export interface CreateTurnoRequest {
  idPersona: number;
  fechaHoraInicio: string;
  observacion?: string;
  servicios: { idServicio: number; cantidad?: number }[];
  aplicarDescuentoEmpleado?: boolean;
}

export interface UpdateTurnoRequest {
  idPersona?: number;
  fechaHoraInicio?: string;
  observacion?: string;
}
