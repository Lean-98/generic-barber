import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';

// Sin esto, un token vencido o revocado solo se notaba cuando el usuario
// navegaba a una pantalla que llama a getProfile(): cualquier otra request
// fallaba en silencio con 401 y la UI quedaba "logueada" pero rota.
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        authService.logout();
      }
      return throwError(() => error);
    }),
  );
};
