import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Servicio, CreateServicioRequest, UpdateServicioRequest } from '../models/servicio.model';
import { PaginatedResult } from '../models/paginated-result.model';

@Injectable({
  providedIn: 'root',
})
export class ServiciosService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  findAll(vigente?: boolean, idCategoria?: number, page = 1, limit = 20): Observable<PaginatedResult<Servicio>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (vigente !== undefined) params['vigente'] = String(vigente);
    if (idCategoria !== undefined) params['idCategoria'] = String(idCategoria);
    return this.http.get<PaginatedResult<Servicio>>(`${this.apiUrl}/servicios`, { params });
  }

  findOne(id: number): Observable<Servicio> {
    return this.http.get<Servicio>(`${this.apiUrl}/servicios/${id}`);
  }

  create(data: CreateServicioRequest): Observable<Servicio> {
    return this.http.post<Servicio>(`${this.apiUrl}/servicios`, data);
  }

  update(id: number, data: UpdateServicioRequest): Observable<Servicio> {
    return this.http.put<Servicio>(`${this.apiUrl}/servicios/${id}`, data);
  }

  remove(id: number): Observable<Servicio> {
    return this.http.delete<Servicio>(`${this.apiUrl}/servicios/${id}`);
  }
}
