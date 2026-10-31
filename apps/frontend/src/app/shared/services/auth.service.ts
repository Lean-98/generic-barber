import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserProfile,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MessageResponse,
  Verify2faRequest,
  Verify2faResponse,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  currentUser = signal<UserProfile | null>(null);
  isAuthenticated = signal<boolean>(!!localStorage.getItem('access_token'));

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (!response.requiresTwoFactor && response.access_token && response.user) {
            localStorage.setItem('access_token', response.access_token);
            this.currentUser.set(response.user);
            this.isAuthenticated.set(true);
          }
        })
      );
  }

  verifyTwoFactor(data: Verify2faRequest): Observable<Verify2faResponse> {
    return this.http
      .post<Verify2faResponse>(`${this.apiUrl}/auth/verify-2fa`, data, { withCredentials: true })
      .pipe(
        tap((response) => {
          localStorage.setItem('access_token', response.access_token);
          this.currentUser.set(response.user);
          this.isAuthenticated.set(true);
        })
      );
  }

  register(data: RegisterRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.apiUrl}/auth/register`, data);
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/forgot-password`, data);
  }

  resetPassword(data: ResetPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/auth/reset-password`, data);
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/auth/profile`).pipe(
      tap((user) => {
        this.currentUser.set(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  loadUser(): void {
    if (this.isAuthenticated()) {
      this.getProfile().subscribe({
        error: () => this.logout(),
      });
    }
  }
}
