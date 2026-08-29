export interface Persona {
  idPersona: number;
  nombre: string;
  apellido: string;
  mail?: string;
  telefono?: string;
  fechaNacimiento?: string;
  instagram?: string;
  ultimoCorte?: string;
  /** Habilita el descuento de personal al reservarle un turno. */
  aplicaDescuentoPersonal: boolean;
}

export interface CreatePersonaRequest {
  nombre: string;
  apellido: string;
  mail?: string;
  telefono?: string;
  fechaNacimiento?: string;
  instagram?: string;
  aplicaDescuentoPersonal?: boolean;
}

export interface UpdatePersonaRequest {
  nombre?: string;
  apellido?: string;
  mail?: string;
  telefono?: string;
  fechaNacimiento?: string;
  instagram?: string;
  aplicaDescuentoPersonal?: boolean;
}
