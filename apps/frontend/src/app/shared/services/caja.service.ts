import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FormaPago,
  Pago,
  MovimientoCaja,
  TotalesCaja,
  CierreCaja,
  CreatePagoRequest,
  CreateMovimientoRequest,
  ConfirmarCierreRequest,
} from '../models/caja.model';

@Injectable({
  providedIn: 'root',
})
export class CajaService {
  private readonly apiUrl = 'http://localhost:3000/api/caja';

  constructor(private readonly http: HttpClient) {}

  // Formas de pago
  findFormasPago(): Observable<FormaPago[]> {
    return this.http.get<FormaPago[]>(`${this.apiUrl}/formas-pago`);
  }

  // Pagos
  procesarPago(data: CreatePagoRequest): Observable<{ pago: Pago; movimiento: MovimientoCaja; turnoActualizado: boolean }> {
    return this.http.post<{ pago: Pago; movimiento: MovimientoCaja; turnoActualizado: boolean }>(`${this.apiUrl}/pagos`, data);
  }

  findPagosByTurno(idTurno: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.apiUrl}/pagos/turno/${idTurno}`);
  }

  // Movimientos
  findMovimientos(fecha?: string): Observable<MovimientoCaja[]> {
    let url = `${this.apiUrl}/movimientos`;
    if (fecha) url += `?fecha=${fecha}`;
    return this.http.get<MovimientoCaja[]>(url);
  }

  findTotales(fecha?: string): Observable<TotalesCaja> {
    let url = `${this.apiUrl}/movimientos/totales`;
    if (fecha) url += `?fecha=${fecha}`;
    return this.http.get<TotalesCaja>(url);
  }

  createMovimiento(data: CreateMovimientoRequest): Observable<MovimientoCaja> {
    return this.http.post<MovimientoCaja>(`${this.apiUrl}/movimientos`, data);
  }

  // Cierre
  iniciarCierre(fecha: string): Observable<CierreCaja> {
    return this.http.post<CierreCaja>(`${this.apiUrl}/cierre/iniciar?fecha=${fecha}`, {});
  }

  confirmarCierre(data: ConfirmarCierreRequest): Observable<CierreCaja> {
    return this.http.post<CierreCaja>(`${this.apiUrl}/cierre/confirmar`, data);
  }

  findCierre(fecha: string): Observable<CierreCaja> {
    return this.http.get<CierreCaja>(`${this.apiUrl}/cierre?fecha=${fecha}`);
  }

  findHistorialCierres(): Observable<CierreCaja[]> {
    return this.http.get<CierreCaja[]>(`${this.apiUrl}/cierre/historial`);
  }
}
