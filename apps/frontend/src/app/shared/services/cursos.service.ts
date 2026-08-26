import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Curso, CreateCursoRequest, UpdateCursoRequest } from '../models/curso.model';
import { PaginatedResult } from '../models/paginated-result.model';

@Injectable({
  providedIn: 'root',
})
export class CursosService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  findAll(vigente?: boolean, page = 1, limit = 20): Observable<PaginatedResult<Curso>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (vigente !== undefined) params['vigente'] = String(vigente);
    return this.http.get<PaginatedResult<Curso>>(`${this.apiUrl}/cursos`, { params });
  }

  findOne(id: number): Observable<Curso> {
    return this.http.get<Curso>(`${this.apiUrl}/cursos/${id}`);
  }

  create(data: CreateCursoRequest): Observable<Curso> {
    return this.http.post<Curso>(`${this.apiUrl}/cursos`, data);
  }

  update(id: number, data: UpdateCursoRequest): Observable<Curso> {
    return this.http.put<Curso>(`${this.apiUrl}/cursos/${id}`, data);
  }

  remove(id: number): Observable<Curso> {
    return this.http.delete<Curso>(`${this.apiUrl}/cursos/${id}`);
  }
}
