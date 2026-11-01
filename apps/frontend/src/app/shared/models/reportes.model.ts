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

export interface ClienteInactivo {
  idPersona: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  mail: string | null;
  ultimaVisita: string | null;
  diasSinVenir: number | null;
  visitas: number;
  registradoEl: string;
}

export interface CostosNegocio {
  costosFijosMensuales: number;
  costoHoraTrabajo: number;
}

export interface ReporteRentabilidad {
  costosConfigurados: boolean;
  dias: number;
  turnosCompletados: number;
  ingresosServicios: number;
  costosVariables: number;
  margenContribucion: number;
  costosFijosPeriodo: number;
  resultado: number;
  costoFidelizacion: number;
  serviciosConFidelizacion: number;
  margenPromedioPorTurno: number | null;
  turnosParaCubrirFijosMes: number | null;
  turnosParaCubrirFijosPeriodo: number | null;
  turnosFaltantesPeriodo: number | null;
  serviciosSinCosto: number;
  aviso: string | null;
}
