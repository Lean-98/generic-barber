export interface ConfiguracionNegocio {
  id?: number;
  nombre: string;
  logoUrl: string | null;
  iconoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  updatedAt?: string;
}

export interface UpdateConfiguracionRequest {
  nombre?: string;
  logoUrl?: string;
  iconoUrl?: string;
  colorPrimario?: string;
  colorSecundario?: string;
}
