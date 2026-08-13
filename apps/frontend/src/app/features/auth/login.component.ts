import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, BrandMarkComponent],
  template: `
    <div class="grid min-h-screen lg:grid-cols-2">
      <!-- Editorial panel -->
      <div
        class="relative hidden flex-col justify-between overflow-hidden bg-neutral p-10 text-neutral-content lg:flex"
      >
        <div class="flex items-center gap-3">
          <app-brand-mark [hero]="true" barHeight="h-14" />
        </div>

        <div class="max-w-md">
          <p
            class="mb-3 text-sm uppercase tracking-[0.2em] text-neutral-content/50"
          >
            Panel de gestión
          </p>
          <h1
            class="font-display text-5xl font-medium leading-[1.05] tracking-tight"
          >
            El día a día de tu negocio, en un solo lugar.
          </h1>
          <p class="mt-5 text-neutral-content/60">
            Turnos, caja y clientes, todo en un solo panel. Para que tu equipo
            se enfoque en el cliente, no en la planilla.
          </p>
        </div>

        <p class="text-xs text-neutral-content/40">
          © {{ currentYear }} {{ brandingService.branding().nombre }}
        </p>

        <div
          class="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        ></div>
      </div>

      <!-- Form panel -->
      <div class="flex items-center justify-center bg-base-100 p-6 sm:p-10">
        <div class="w-full max-w-sm">
          <div class="mb-8 flex items-center gap-3 lg:hidden">
            <app-brand-mark [hero]="true" barHeight="h-10" />
          </div>

          <h2 class="font-display text-2xl font-medium">Iniciar sesión</h2>
          <p class="mt-1 text-sm text-base-content/60">
            Ingresá tus credenciales para continuar.
          </p>

          <form (ngSubmit)="onSubmit()" class="mt-8 space-y-4">
            <div class="form-control">
              <label class="label pb-1.5">
                <span class="label-text text-sm font-medium"
                  >Usuario o email</span
                >
              </label>
              <input
                type="text"
                class="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
                [class.input-error]="error()"
                [(ngModel)]="login"
                name="login"
                placeholder="admin o admin@example.com"
                required
              />
            </div>

            <div class="form-control">
              <label class="label pb-1.5">
                <span class="label-text text-sm font-medium">Contraseña</span>
              </label>
              <input
                type="password"
                class="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
                [class.input-error]="error()"
                [(ngModel)]="password"
                name="password"
                placeholder="••••••••"
                required
              />
              <div class="mt-1.5 text-right">
                <a routerLink="/forgot-password" class="text-sm text-base-content/60 hover:text-primary">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primary mt-2 w-full"
              [disabled]="loading()"
            >
              @if (loading()) {
                <app-icon
                  name="loader"
                  [size]="18"
                  className="animate-spin-slow"
                />
              }
              {{ loading() ? 'Ingresando…' : 'Ingresar' }}
            </button>

            @if (error()) {
              <div class="alert alert-error py-2.5 text-sm">
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
  protected readonly brandingService = inject(BrandingService);

  login = '';
  password = '';
  loading = signal(false);
  error = signal('');
  currentYear = new Date().getFullYear();

  onSubmit(): void {
    if (!this.login || !this.password) {
      this.error.set('Completá usuario y contraseña');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService
      .login({ login: this.login, password: this.password })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          const message =
            err?.error?.message || err?.message || 'Error al iniciar sesión';
          this.error.set(message);
        },
      });
  }
}
