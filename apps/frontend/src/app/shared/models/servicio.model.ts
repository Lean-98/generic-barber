import { Categoria } from './categoria.model';

export interface Servicio {
  idServicio: number;
  nombre: string;
  descripcion?: string;
  idCategoria?: number;
  categoria?: Categoria;
  precio: number;
  duracionMinutos: number;
  urlImagen?: string;
  vigente: boolean;
  cuentaParaFidelizacion: boolean;
  /** Costo estimado de insumos por servicio (solo llega con sesión iniciada). */
  costoInsumos?: number;
  createdAt?: string;
  updatedAt?: string;
  historial?: ServicioHistorial[];
}

export interface ServicioHistorial {
  idHistorial: number;
  idServicio: number;
  precio: number;
  duracionMinutos: number;
  vigente: boolean;
  fechaCambio: string;
}

export interface CreateServicioRequest {
  nombre: string;
  descripcion?: string;
  idCategoria?: number;
  precio: number;
  duracionMinutos: number;
  urlImagen?: string;
  vigente?: boolean;
  cuentaParaFidelizacion?: boolean;
  costoInsumos?: number;
}

export interface UpdateServicioRequest {
  nombre?: string;
  descripcion?: string;
  idCategoria?: number;
  precio?: number;
  duracionMinutos?: number;
  urlImagen?: string;
  vigente?: boolean;
  cuentaParaFidelizacion?: boolean;
  costoInsumos?: number;
}
