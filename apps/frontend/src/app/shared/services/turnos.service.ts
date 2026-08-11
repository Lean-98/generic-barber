import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Turno, CreateTurnoRequest, UpdateTurnoRequest } from '../models/turno.model';
import { PaginatedResult } from '../models/paginated-result.model';

@Injectable({
  providedIn: 'root',
})
export class TurnosService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  findAll(fechaDesde?: string, fechaHasta?: string, page = 1, limit = 20): Observable<PaginatedResult<Turno>> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (fechaDesde) params['fechaDesde'] = fechaDesde;
    if (fechaHasta) params['fechaHasta'] = fechaHasta;
    return this.http.get<PaginatedResult<Turno>>(`${this.apiUrl}/turnos`, { params });
  }

  create(data: CreateTurnoRequest): Observable<Turno> {
    return this.http.post<Turno>(`${this.apiUrl}/turnos`, data);
  }

  confirmar(id: number): Observable<Turno> {
    return this.http.post<Turno>(`${this.apiUrl}/turnos/${id}/confirmar`, {});
  }

  cancelar(id: number): Observable<Turno> {
    return this.http.delete<Turno>(`${this.apiUrl}/turnos/${id}`);
  }

  iniciarAtencion(id: number): Observable<Turno> {
    return this.http.post<Turno>(`${this.apiUrl}/turnos/${id}/iniciar`, {});
  }

  finalizar(id: number): Observable<Turno> {
    return this.http.post<Turno>(`${this.apiUrl}/turnos/${id}/finalizar`, {});
  }

  registrarPago(id: number): Observable<Turno> {
    return this.http.post<Turno>(`${this.apiUrl}/turnos/${id}/pagar`, {});
  }

  noShow(id: number): Observable<Turno> {
    return this.http.post<Turno>(`${this.apiUrl}/turnos/${id}/no-show`, {});
  }

  calcularTotal(id: number): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${this.apiUrl}/turnos/${id}/total`);
  }
}
