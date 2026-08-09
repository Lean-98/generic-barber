import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  message?: string;
  authUrl?: string;
  calendarId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleCalendarService {
  private readonly apiUrl = `${environment.apiUrl}/google-calendar`;

  constructor(private readonly http: HttpClient) {}

  getStatus(): Observable<GoogleCalendarStatus> {
    return this.http.get<GoogleCalendarStatus>(`${this.apiUrl}/status`);
  }

  getAuthUrl(): Observable<{ authUrl: string }> {
    return this.http.get<{ authUrl: string }>(`${this.apiUrl}/auth-url`);
  }

  connect(code: string): Observable<{ message: string; connected: boolean }> {
    return this.http.post<{ message: string; connected: boolean }>(`${this.apiUrl}/connect`, null, {
      params: { code },
    });
  }

  disconnect(): Observable<{ message: string; connected: boolean }> {
    return this.http.delete<{ message: string; connected: boolean }>(`${this.apiUrl}/disconnect`);
  }
}
