export interface Curso {
  idCurso: number;
  nombre: string;
  subtitulo?: string;
  descripcion?: string;
  precio: number;
  duracion?: string;
  temario?: string[];
  fechaInicio?: string;
  fechaFin?: string;
  diaCursada?: string[];
  horario?: string;
  lugar?: string;
  cupos?: number;
  inscripcionInicio?: string;
  inscripcionHasta?: string;
  requisitoImportante?: string;
  urlImagen?: string;
  vigente: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCursoRequest {
  nombre: string;
  subtitulo?: string;
  descripcion?: string;
  precio: number;
  duracion?: string;
  temario?: string[];
  fechaInicio?: string;
  fechaFin?: string;
  diaCursada?: string[];
  horario?: string;
  lugar?: string;
  cupos?: number;
  inscripcionInicio?: string;
  inscripcionHasta?: string;
  requisitoImportante?: string;
  urlImagen?: string;
  vigente?: boolean;
}

export interface UpdateCursoRequest {
  nombre?: string;
  subtitulo?: string;
  descripcion?: string;
  precio?: number;
  duracion?: string;
  temario?: string[];
  fechaInicio?: string;
  fechaFin?: string;
  diaCursada?: string[];
  horario?: string;
  lugar?: string;
  cupos?: number;
  inscripcionInicio?: string;
  inscripcionHasta?: string;
  requisitoImportante?: string;
  urlImagen?: string;
  vigente?: boolean;
}
