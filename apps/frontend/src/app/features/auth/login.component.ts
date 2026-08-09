import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-base-200 p-4 text-base-content">
      <div class="card w-full max-w-md bg-base-100 shadow-lg">
        <div class="card-body space-y-6">
          <div class="text-center">
            <div class="avatar placeholder mx-auto mb-4">
              <div class="bg-primary text-primary-content w-14 rounded-xl">
                <app-icon name="scissors" [size]="28" />
              </div>
            </div>
            <h1 class="text-2xl font-bold">Peluquería</h1>
            <p class="text-base-content/60 text-sm">Ingresá tus credenciales para continuar</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Usuario o Email</span>
              </label>
              <input
                type="text"
                class="input input-bordered w-full"
                [class.input-error]="error()"
                [(ngModel)]="login"
                name="login"
                placeholder="admin o admin@example.com"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Contraseña</span>
              </label>
              <input
                type="password"
                class="input input-bordered w-full"
                [class.input-error]="error()"
                [(ngModel)]="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" class="btn btn-primary w-full" [class.btn-loading]="loading()" [disabled]="loading()">
              @if (loading()) {
                <app-icon name="loader" [size]="18" className="animate-spin-slow" />
              }
              {{ loading() ? 'Ingresando...' : 'Ingresar' }}
            </button>

            @if (error()) {
              <div class="alert alert-error alert-sm py-2 text-sm">
                <app-icon name="alert-circle" [size]="18" />
                <span>{{ error() }}</span>
              </div>
            }
          </form>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  login = '';
  password = '';
  loading = signal(false);
  error = signal('');

  onSubmit(): void {
    if (!this.login || !this.password) {
      this.error.set('Completá usuario y contraseña');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.login({ login: this.login, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err?.error?.message || err?.message || 'Error al iniciar sesión';
        this.error.set(message);
      },
    });
  }
}
