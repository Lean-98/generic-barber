export type EstadoCupon = 'ACTIVO' | 'PAUSADO' | 'PROGRAMADO' | 'VENCIDO' | 'AGOTADO';

export interface Cupon {
  idCupon: number;
  codigo: string;
  descripcion: string | null;
  descuentoPorcentaje: number;
  /** AAAA-MM-DD (inclusive). */
  desde: string;
  hasta: string;
  usosMaximos: number | null;
  usos: number;
  activo: boolean;
  estado: EstadoCupon;
  /** "PROMO" (creado en el panel) o "CUMPLEANOS" (automático). */
  origen: 'PROMO' | 'CUMPLEANOS';
  persona: { idPersona: number; nombre: string; apellido: string } | null;
}

export interface CuponRequest {
  codigo: string;
  descripcion?: string;
  descuentoPorcentaje: number;
  desde: string;
  hasta: string;
  usosMaximos?: number | null;
  activo?: boolean;
}

export type ValidacionCupon =
  | { valido: true; codigo: string; descuentoPorcentaje: number; hasta: string }
  | { valido: false; mensaje: string };
