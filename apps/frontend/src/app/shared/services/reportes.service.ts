import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ClienteInactivo,
  ClienteReporte,
  CostosNegocio,
  IngresosPorDia,
  ReporteRentabilidad,
  IngresosPorFormaPago,
  ReporteResumen,
  ServicioReporte,
  TurnosPorEstado,
} from '../models/reportes.model';

@Injectable({
  providedIn: 'root',
})
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reportes`;

  getResumen(desde?: string, hasta?: string): Observable<ReporteResumen> {
    return this.http.get<ReporteResumen>(`${this.apiUrl}/resumen`, { params: this.buildParams(desde, hasta) });
  }

  getIngresosPorDia(desde?: string, hasta?: string): Observable<IngresosPorDia[]> {
    return this.http.get<IngresosPorDia[]>(`${this.apiUrl}/ingresos`, { params: this.buildParams(desde, hasta) });
  }

  getTurnosPorEstado(desde?: string, hasta?: string): Observable<TurnosPorEstado[]> {
    return this.http.get<TurnosPorEstado[]>(`${this.apiUrl}/turnos`, { params: this.buildParams(desde, hasta) });
  }

  getServicios(desde?: string, hasta?: string, limite = 10): Observable<ServicioReporte[]> {
    return this.http.get<ServicioReporte[]>(`${this.apiUrl}/servicios`, {
      params: { ...this.buildParams(desde, hasta), limite: limite.toString() },
    });
  }

  getClientes(desde?: string, hasta?: string, limite = 10): Observable<ClienteReporte[]> {
    return this.http.get<ClienteReporte[]>(`${this.apiUrl}/clientes`, {
      params: { ...this.buildParams(desde, hasta), limite: limite.toString() },
    });
  }

  getFormasPago(desde?: string, hasta?: string): Observable<IngresosPorFormaPago[]> {
    return this.http.get<IngresosPorFormaPago[]>(`${this.apiUrl}/formas-pago`, {
      params: this.buildParams(desde, hasta),
    });
  }

  getClientesInactivos(dias: number): Observable<ClienteInactivo[]> {
    return this.http.get<ClienteInactivo[]>(`${this.apiUrl}/clientes-inactivos`, { params: { dias: String(dias) } });
  }

  getClientesSinVisitas(): Observable<ClienteInactivo[]> {
    return this.http.get<ClienteInactivo[]>(`${this.apiUrl}/clientes-sin-visitas`);
  }

  getRentabilidad(desde?: string, hasta?: string): Observable<ReporteRentabilidad> {
    return this.http.get<ReporteRentabilidad>(`${this.apiUrl}/rentabilidad`, { params: this.buildParams(desde, hasta) });
  }

  getCostos(): Observable<CostosNegocio> {
    return this.http.get<CostosNegocio>(`${this.apiUrl}/costos`);
  }

  updateCostos(costos: CostosNegocio): Observable<CostosNegocio> {
    return this.http.put<CostosNegocio>(`${this.apiUrl}/costos`, costos);
  }

  private buildParams(desde?: string, hasta?: string): Record<string, string> {
    const params: Record<string, string> = {};
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return params;
  }
}
