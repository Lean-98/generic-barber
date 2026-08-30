import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-reset-password',
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
            Elegí tu nueva contraseña.
          </h1>
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

          @if (success()) {
            <h2 class="font-display text-2xl font-medium">Contraseña actualizada</h2>
            <p class="mt-3 text-sm text-base-content/60">
              Tu contraseña se cambió correctamente. Ya podés iniciar sesión con ella.
            </p>
            <button type="button" class="btn btn-primary mt-6 w-full" (click)="irALogin()">
              Iniciar sesión
            </button>
          } @else if (!token) {
            <h2 class="font-display text-2xl font-medium">Enlace inválido</h2>
            <p class="mt-1 text-sm text-base-content/60">
              Este enlace de recuperación es incompleto o inválido. Pedí uno nuevo.
            </p>
          } @else {
            <h2 class="font-display text-2xl font-medium">Nueva contraseña</h2>
            <p class="mt-1 text-sm text-base-content/60">
              Elegí una contraseña de al menos 8 caracteres.
            </p>

            <form (ngSubmit)="onSubmit()" class="mt-8 space-y-4">
              <div class="form-control">
                <label class="label pb-1.5">
                  <span class="label-text text-sm font-medium">Contraseña nueva</span>
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
              </div>

              <div class="form-control">
                <label class="label pb-1.5">
                  <span class="label-text text-sm font-medium">Repetir contraseña</span>
                </label>
                <input
                  type="password"
                  class="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-primary/40"
                  [class.input-error]="error()"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••"
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
                {{ loading() ? 'Guardando…' : 'Guardar contraseña' }}
              </button>

              @if (error()) {
                <div class="alert alert-error py-2.5 text-sm">
                  <app-icon name="alert-circle" [size]="18" />
                  <span>{{ error() }}</span>
                </div>
              }
            </form>
          }

          @if (!success()) {
            <a
              routerLink="/login"
              class="mt-6 inline-flex items-center gap-1.5 text-sm text-base-content/60 hover:text-primary"
            >
              <app-icon name="arrow-left" [size]="16" />
              Volver a iniciar sesión
            </a>
          }
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly brandingService = inject(BrandingService);

  token = this.route.snapshot.queryParamMap.get('token') ?? '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  error = signal('');
  success = signal(false);
  currentYear = new Date().getFullYear();

  onSubmit(): void {
    if (this.password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Las contraseñas no coinciden');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.resetPassword({ token: this.token, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        const message = err?.error?.message || err?.message || 'No se pudo restablecer la contraseña';
        this.error.set(message);
      },
    });
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }
}
