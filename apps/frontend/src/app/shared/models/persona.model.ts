export interface Persona {
  idPersona: number;
  nombre: string;
  apellido: string;
  mail?: string;
  telefono?: string;
  fechaNacimiento?: string;
  instagram?: string;
  ultimoCorte?: string;
}

export interface CreatePersonaRequest {
  nombre: string;
  apellido: string;
  mail?: string;
  telefono?: string;
  fechaNacimiento?: string;
  instagram?: string;
}

export interface UpdatePersonaRequest {
  nombre?: string;
  apellido?: string;
  mail?: string;
  telefono?: string;
  fechaNacimiento?: string;
  instagram?: string;
}
