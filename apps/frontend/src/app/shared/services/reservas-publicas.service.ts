import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ValidacionCupon } from '../models/cupon.model';

export interface DisponibilidadResponse {
  slots: string[];
  duracionTotal: number;
}

export interface ReservaRequest {
  nombre?: string;
  apellido?: string;
  email: string;
  telefono?: string;
  /** AAAA-MM-DD, para el beneficio de cumpleaños. */
  fechaNacimiento?: string;
  codigoCupon?: string;
  /** Solo para un cliente nuevo: si acepta recibir promociones por email. */
  recibePromociones?: boolean;
  fechaHoraInicio: string;
  observacion?: string;
  servicios: { idServicio: number; cantidad?: number }[];
  idFormaPagoPreferida: number;
}

export interface ClienteExistenteResponse {
  existe: boolean;
  nombre?: string;
  /** Cliente existente sin cumpleaños cargado: se le pide solo ese dato. */
  faltaFechaNacimiento?: boolean;
  /** Visitas en el club de fidelización; null si el programa está apagado o es empleado. */
  fidelizacion?: ProgresoClub | null;
}

export interface ProgresoClub {
  visitasRequeridas: number;
  descuentoPorcentaje: number;
  /** Hechas o ya reservadas en el ciclo actual, de 0 a N-1. */
  visitasEnCiclo: number;
  proximaConDescuento: boolean;
}

export interface FormaPagoPublica {
  idFormaPago: number;
  nombre: string;
}

/** Lo que muestra la página pública "Cancelar turno" (link que llega por mail). */
export interface TurnoParaCancelar {
  nombreCliente: string;
  fechaHoraInicio: string;
  servicios: string[];
  estado: string;
  puedeCancelar: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ReservasPublicasService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getDisponibilidad(fecha: string, servicios: string): Observable<DisponibilidadResponse> {
    return this.http.get<DisponibilidadResponse>(
      `${this.apiUrl}/turnos-publicos/disponibilidad`,
      { params: { fecha, servicios } }
    );
  }

  reservar(data: ReservaRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-publicos/reservar`, data);
  }

  buscarClientePorEmail(email: string): Observable<ClienteExistenteResponse> {
    return this.http.get<ClienteExistenteResponse>(`${this.apiUrl}/turnos-publicos/cliente`, { params: { email } });
  }

  validarCupon(codigo: string, email?: string): Observable<ValidacionCupon> {
    const params: Record<string, string> = { codigo };
    if (email) params['email'] = email;
    return this.http.get<ValidacionCupon>(`${this.apiUrl}/turnos-publicos/cupon`, { params });
  }

  findFormasPago(): Observable<FormaPagoPublica[]> {
    return this.http.get<FormaPagoPublica[]>(`${this.apiUrl}/turnos-publicos/formas-pago`);
  }

  getTurnoParaCancelar(token: string): Observable<TurnoParaCancelar> {
    return this.http.get<TurnoParaCancelar>(`${this.apiUrl}/turnos-publicos/cancelacion`, { params: { token } });
  }

  cancelarTurno(token: string): Observable<TurnoParaCancelar> {
    return this.http.post<TurnoParaCancelar>(`${this.apiUrl}/turnos-publicos/cancelar`, { token });
  }
}
