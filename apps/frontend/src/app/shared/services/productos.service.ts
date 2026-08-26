import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, CreateProductoRequest, UpdateProductoRequest } from '../models/producto.model';
import { PaginatedResult } from '../models/paginated-result.model';

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  findAll(vigente?: boolean, idCategoria?: number, page = 1, limit = 20): Observable<PaginatedResult<Producto>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (vigente !== undefined) params['vigente'] = String(vigente);
    if (idCategoria !== undefined) params['idCategoria'] = String(idCategoria);
    return this.http.get<PaginatedResult<Producto>>(`${this.apiUrl}/productos`, { params });
  }

  findOne(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/productos/${id}`);
  }

  create(data: CreateProductoRequest): Observable<Producto> {
    return this.http.post<Producto>(`${this.apiUrl}/productos`, data);
  }

  update(id: number, data: UpdateProductoRequest): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/productos/${id}`, data);
  }

  remove(id: number): Observable<Producto> {
    return this.http.delete<Producto>(`${this.apiUrl}/productos/${id}`);
  }
}
