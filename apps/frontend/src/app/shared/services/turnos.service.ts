import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Turno, CreateTurnoRequest, UpdateTurnoRequest } from '../models/turno.model';

@Injectable({
  providedIn: 'root',
})
export class TurnosService {
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  findAll(fechaDesde?: string, fechaHasta?: string): Observable<Turno[]> {
    let params: Record<string, string> = {};
    if (fechaDesde) params['fechaDesde'] = fechaDesde;
    if (fechaHasta) params['fechaHasta'] = fechaHasta;
    return this.http.get<Turno[]>(`${this.apiUrl}/turnos`, { params });
  }

  create(data: CreateTurnoRequest): Observable<Turno> {
    return this.http.post<Turno>(`${this.apiUrl}/turnos`, data);
  }

  confirmar(id: number): Observable<Turno> {
    return this.http.post<Turno>(`${this.apiUrl}/turnos/${id}/confirmar`, {});
  }

  cancelar(id: number): Observable<Turno> {
    return this.http.post<Turno>(`${this.apiUrl}/turnos/${id}/cancelar`, {});
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
