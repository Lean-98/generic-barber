export interface ReporteResumen {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  totalTurnos: number;
  turnosPagados: number;
  turnosCancelados: number;
}

export interface IngresosPorDia {
  fecha: string;
  ingresos: number;
  egresos: number;
  balance: number;
}

export interface TurnosPorEstado {
  estado: string;
  cantidad: number;
}

export interface ServicioReporte {
  idServicio: number;
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface ClienteReporte {
  idPersona: number;
  nombre: string;
  apellido: string;
  cantidadTurnos: number;
  ingresos: number;
}

export interface IngresosPorFormaPago {
  idFormaPago: number;
  nombre: string;
  monto: number;
}
