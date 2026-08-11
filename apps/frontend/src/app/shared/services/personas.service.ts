import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Persona, CreatePersonaRequest, UpdatePersonaRequest } from '../models/persona.model';
import { Turno } from '../models/turno.model';
import { PaginatedResult } from '../models/paginated-result.model';

@Injectable({
  providedIn: 'root',
})
export class PersonasService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  findAll(page = 1, limit = 20): Observable<PaginatedResult<Persona>> {
    return this.http.get<PaginatedResult<Persona>>(`${this.apiUrl}/personas`, {
      params: { page: String(page), limit: String(limit) },
    });
  }

  findOne(id: number): Observable<Persona> {
    return this.http.get<Persona>(`${this.apiUrl}/personas/${id}`);
  }

  create(data: CreatePersonaRequest): Observable<Persona> {
    return this.http.post<Persona>(`${this.apiUrl}/personas`, data);
  }

  update(id: number, data: UpdatePersonaRequest): Observable<Persona> {
    return this.http.put<Persona>(`${this.apiUrl}/personas/${id}`, data);
  }

  remove(id: number): Observable<Persona> {
    return this.http.delete<Persona>(`${this.apiUrl}/personas/${id}`);
  }

  search(query: string, page = 1, limit = 20): Observable<PaginatedResult<Persona>> {
    return this.http.get<PaginatedResult<Persona>>(`${this.apiUrl}/personas/search`, {
      params: { q: query, page: String(page), limit: String(limit) },
    });
  }

  findTurnos(id: number): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.apiUrl}/personas/${id}/turnos`);
  }
}
