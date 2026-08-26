import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Categoria, CreateCategoriaRequest, UpdateCategoriaRequest } from '../models/categoria.model';

@Injectable({
  providedIn: 'root',
})
export class CategoriasService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  findAll(vigente?: boolean): Observable<Categoria[]> {
    const params: Record<string, string> = {};
    if (vigente !== undefined) params['vigente'] = String(vigente);
    return this.http.get<Categoria[]>(`${this.apiUrl}/categorias`, { params });
  }

  create(data: CreateCategoriaRequest): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.apiUrl}/categorias`, data);
  }

  update(id: number, data: UpdateCategoriaRequest): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}/categorias/${id}`, data);
  }

  remove(id: number): Observable<Categoria> {
    return this.http.delete<Categoria>(`${this.apiUrl}/categorias/${id}`);
  }
}
