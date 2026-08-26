export interface Categoria {
  idCategoria: number;
  nombre: string;
  vigente: boolean;
  createdAt?: string;
}

export interface CreateCategoriaRequest {
  nombre: string;
  vigente?: boolean;
}

export interface UpdateCategoriaRequest {
  nombre?: string;
  vigente?: boolean;
}
