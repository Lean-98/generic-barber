import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-forgot-password',
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
            Recuperá el acceso a tu cuenta.
          </h1>
          <p class="mt-5 text-neutral-content/60">
            Te mandamos un enlace por email para elegir una contraseña nueva.
          </p>
        </div>

        <p class="text-xs text-neutral-content/60">
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

          @if (!submitted()) {
            <h2 class="font-display text-2xl font-medium">
              ¿Olvidaste tu contraseña?
            </h2>
            <p class="mt-1 text-sm text-base-content/60">
              Ingresá tu email y te mandamos un enlace para restablecerla.
            </p>

            <form (ngSubmit)="onSubmit()" class="mt-8 space-y-4">
              <div class="form-control">
                <label class="label pb-1.5">
                  <span class="label-text text-sm font-medium">Email</span>
                </label>
                <input
                  type="email"
                  class="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
                  [class.input-error]="error()"
                  [(ngModel)]="email"
                  name="email"
                  placeholder="admin@example.com"
                  required
                />
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
                {{ loading() ? 'Enviando…' : 'Enviar enlace' }}
              </button>

              @if (error()) {
                <div class="alert alert-error py-2.5 text-sm">
                  <app-icon name="alert-circle" [size]="18" />
                  <span>{{ error() }}</span>
                </div>
              }
            </form>
          } @else {
            <h2 class="font-display text-2xl font-medium">Revisá tu email</h2>
            <p class="mt-3 text-sm text-base-content/60">
              Si el email existe en nuestro sistema, vas a recibir un enlace
              para restablecer tu contraseña en los próximos minutos.
            </p>
          }

          <a
            routerLink="/login"
            class="mt-6 inline-flex items-center gap-1.5 text-sm text-base-content/60 hover:text-primary"
          >
            <app-icon name="arrow-left" [size]="16" />
            Volver a iniciar sesión
          </a>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  protected readonly brandingService = inject(BrandingService);

  email = '';
  loading = signal(false);
  error = signal('');
  submitted = signal(false);
  currentYear = new Date().getFullYear();

  onSubmit(): void {
    if (!this.email) {
      this.error.set('Ingresá tu email');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    // El backend siempre responde igual exista o no el email (para no
    // filtrar qué cuentas existen), así que acá tampoco se ramifica la UI
    // por éxito o error de la request.
    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
    });
  }
}
