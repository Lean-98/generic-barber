export interface Turno {
  idTurno: number;
  idPersona: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  estado: string;
  observacion?: string;
  fechaCreacion: string;
  googleEventId?: string;
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
}

export interface UpdateTurnoRequest {
  idPersona?: number;
  fechaHoraInicio?: string;
  observacion?: string;
}
