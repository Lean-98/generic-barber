export interface HorarioDia {
  dia: number; // 0 = domingo ... 6 = sábado (convención Date.getDay())
  cerrado: boolean;
  abre?: string; // "HH:mm"
  cierra?: string; // "HH:mm"
  abre2?: string; // "HH:mm" — apertura del segundo turno (horario partido)
  cierra2?: string; // "HH:mm" — cierre del segundo turno (horario partido)
}

export type ClaveBloqueSobreNosotros = 'quienesSomos' | 'nuestraHistoria' | 'mision' | 'valores';

export interface BloqueSobreNosotros {
  clave: ClaveBloqueSobreNosotros;
  titulo: string;
  descripcion?: string;
}

export type ClaveBloqueClub = 'presentarTarjeta' | 'empresa' | 'cumpleanos' | 'recomendar';

export interface BloqueClub {
  clave: ClaveBloqueClub;
  titulo: string;
  descripcion?: string;
}

export interface ConfiguracionNegocio {
  id?: number;
  nombre: string;
  logoUrl: string | null;
  iconoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  heroImageUrl: string | null;
  descripcion: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  googleReviewsUrl: string | null;
  whatsappUrl: string | null;
  politicaReservas: string | null;
  horarios: HorarioDia[] | null;
  galeriaUrls: string[] | null;
  productosTitulo: string | null;
  productosDescripcion: string | null;
  cursosTitulo: string | null;
  cursosDescripcion: string | null;
  sobreNosotros: BloqueSobreNosotros[] | null;
  sobreNosotrosBajada: string | null;
  clubNombre: string | null;
  clubBajada: string | null;
  clubImagenUrl: string | null;
  clubBeneficios: BloqueClub[] | null;
  clubNota: string | null;
  mostrarNosotros: boolean;
  mostrarClub: boolean;
  mostrarTienda: boolean;
  mostrarCursos: boolean;
  mostrarServicios: boolean;
  mostrarGaleria: boolean;
  mostrarUbicacion: boolean;
  fidelizacionActiva: boolean;
  fidelizacionVisitasRequeridas: number | null;
  fidelizacionDescuentoPorcentaje: number | null;
  fidelizacionFechaInicio: string | null;
  descuentoEmpleadoActivo: boolean;
  descuentoEmpleadoPorcentaje: number | null;
  updatedAt?: string;
}

export interface UpdateConfiguracionRequest {
  nombre?: string;
  logoUrl?: string;
  iconoUrl?: string;
  colorPrimario?: string;
  colorSecundario?: string;
  descripcion?: string;
  heroImageUrl?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  googleReviewsUrl?: string;
  whatsappUrl?: string;
  politicaReservas?: string;
  horarios?: HorarioDia[];
  galeriaUrls?: string[];
  productosTitulo?: string;
  productosDescripcion?: string;
  cursosTitulo?: string;
  cursosDescripcion?: string;
  sobreNosotros?: BloqueSobreNosotros[];
  sobreNosotrosBajada?: string;
  clubNombre?: string;
  clubBajada?: string;
  clubImagenUrl?: string;
  clubBeneficios?: BloqueClub[];
  clubNota?: string;
  mostrarNosotros?: boolean;
  mostrarClub?: boolean;
  mostrarTienda?: boolean;
  mostrarCursos?: boolean;
  mostrarServicios?: boolean;
  mostrarGaleria?: boolean;
  mostrarUbicacion?: boolean;
  fidelizacionActiva?: boolean;
  fidelizacionVisitasRequeridas?: number;
  fidelizacionDescuentoPorcentaje?: number;
  fidelizacionFechaInicio?: string;
  descuentoEmpleadoActivo?: boolean;
  descuentoEmpleadoPorcentaje?: number;
}
