export interface Servicio {
  idServicio: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  precio: number;
  duracionMinutos: number;
  urlImagen?: string;
  vigente: boolean;
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
  categoria?: string;
  precio: number;
  duracionMinutos: number;
  urlImagen?: string;
  vigente?: boolean;
}

export interface UpdateServicioRequest {
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  precio?: number;
  duracionMinutos?: number;
  urlImagen?: string;
  vigente?: boolean;
}
