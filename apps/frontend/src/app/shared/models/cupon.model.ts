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
