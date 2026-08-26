export interface Curso {
  idCurso: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion?: string;
  urlImagen?: string;
  vigente: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCursoRequest {
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion?: string;
  urlImagen?: string;
  vigente?: boolean;
}

export interface UpdateCursoRequest {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  duracion?: string;
  urlImagen?: string;
  vigente?: boolean;
}
