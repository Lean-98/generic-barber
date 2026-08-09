import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfiguracionNegocio, UpdateConfiguracionRequest } from '../models/configuracion.model';

@Injectable({
  providedIn: 'root',
})
export class ConfiguracionService {
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  getBranding(): Observable<ConfiguracionNegocio> {
    return this.http.get<ConfiguracionNegocio>(`${this.apiUrl}/configuracion/branding`);
  }

  updateBranding(data: UpdateConfiguracionRequest): Observable<ConfiguracionNegocio> {
    return this.http.put<ConfiguracionNegocio>(`${this.apiUrl}/configuracion/branding`, data);
  }
}
