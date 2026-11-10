import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CumpleanosProximo {
  idPersona: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  mail: string | null;
  /** AAAA-MM-DD del próximo cumple. */
  fecha: string;
  edad: number;
  esHoy: boolean;
  recibePromociones: boolean;
  cupon: { codigo: string; descuentoPorcentaje: number; hasta: string; usado: boolean } | null;
}

export interface PreferenciaPromociones {
  nombre: string;
  recibePromociones: boolean;
}

@Injectable({ providedIn: 'root' })
export class CumpleanosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  proximos(dias = 7): Observable<CumpleanosProximo[]> {
    return this.http.get<CumpleanosProximo[]>(`${this.apiUrl}/cumpleanos/proximos`, { params: { dias: String(dias) } });
  }

  getPreferencia(token: string): Observable<PreferenciaPromociones> {
    return this.http.get<PreferenciaPromociones>(`${this.apiUrl}/promociones/preferencia`, { params: { token } });
  }

  setPreferencia(token: string, recibePromociones: boolean): Observable<PreferenciaPromociones> {
    return this.http.post<PreferenciaPromociones>(`${this.apiUrl}/promociones/preferencia`, { token, recibePromociones });
  }
}
