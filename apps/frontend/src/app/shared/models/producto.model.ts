import { Categoria } from './categoria.model';

export interface Producto {
  idProducto: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  urlImagen?: string;
  idCategoria?: number;
  categoria?: Categoria;
  vigente: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductoRequest {
  nombre: string;
  descripcion?: string;
  precio: number;
  urlImagen?: string;
  idCategoria?: number;
  vigente?: boolean;
}

export interface UpdateProductoRequest {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  urlImagen?: string;
  idCategoria?: number;
  vigente?: boolean;
}
