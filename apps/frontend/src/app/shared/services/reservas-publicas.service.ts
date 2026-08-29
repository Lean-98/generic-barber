import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DisponibilidadResponse {
  slots: string[];
  duracionTotal: number;
}

export interface ReservaRequest {
  nombre?: string;
  apellido?: string;
  email: string;
  telefono?: string;
  fechaHoraInicio: string;
  observacion?: string;
  servicios: { idServicio: number; cantidad?: number }[];
}

export interface ClienteExistenteResponse {
  existe: boolean;
  nombre?: string;
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
}
