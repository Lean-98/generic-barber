import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cupon, CuponRequest } from '../models/cupon.model';

@Injectable({ providedIn: 'root' })
export class CuponesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cupones`;

  findAll(): Observable<Cupon[]> {
    return this.http.get<Cupon[]>(this.apiUrl);
  }

  create(data: CuponRequest): Observable<Cupon> {
    return this.http.post<Cupon>(this.apiUrl, data);
  }

  update(id: number, data: Partial<CuponRequest>): Observable<Cupon> {
    return this.http.put<Cupon>(`${this.apiUrl}/${id}`, data);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
