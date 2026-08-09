import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Servicio, CreateServicioRequest, UpdateServicioRequest } from '../models/servicio.model';

@Injectable({
  providedIn: 'root',
})
export class ServiciosService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  findAll(vigente?: boolean, categoria?: string): Observable<Servicio[]> {
    let url = `${this.apiUrl}/servicios`;
    const params = new URLSearchParams();
    if (vigente !== undefined) params.set('vigente', String(vigente));
    if (categoria) params.set('categoria', categoria);
    const query = params.toString();
    if (query) url += `?${query}`;
    return this.http.get<Servicio[]>(url);
  }

  findCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/servicios/categorias`);
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
