import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { BrandingService } from '../../core/services/branding.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';

const COLOR_PRIMARIO_DEFECTO = '#A9762F';
const COLOR_SECUNDARIO_DEFECTO = '#7A2E2E';

@Component({
  selector: 'app-branding-config',
  standalone: true,
  imports: [FormsModule, IconComponent, BrandMarkComponent],
  template: `
    <div class="space-y-6 text-base-content">
      <div>
        <h1 class="text-3xl font-medium tracking-tight">Marca</h1>
        <p class="text-base-content/60 mt-1">Nombre, logo e identidad visual de tu negocio</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="card bg-base-100 shadow-sm lg:col-span-2">
          <div class="card-body">
            @if (loading()) {
              <div class="flex items-center justify-center gap-2 py-12">
                <app-icon name="loader" [size]="20" className="animate-spin" />
                <span class="text-base-content/70">Cargando...</span>
              </div>
            } @else {
              <form (ngSubmit)="guardar()" class="space-y-4">
                <div class="form-control">
                  <label class="label"><span class="label-text">Nombre del negocio</span></label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="nombre" name="nombre" placeholder="Peluquería" maxlength="80" />
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="form-control">
                    <label class="label"><span class="label-text">URL del logo</span></label>
                    <input type="text" class="input input-bordered w-full" [(ngModel)]="logoUrl" name="logoUrl" placeholder="https://res.cloudinary.com/.../logo.png" />
                    <label class="label"><span class="label-text-alt text-base-content/50">Usado en el panel y en el login. Dejar vacío para quitarlo.</span></label>
                  </div>
                  <div class="form-control">
                    <label class="label"><span class="label-text">URL del ícono</span></label>
                    <input type="text" class="input input-bordered w-full" [(ngModel)]="iconoUrl" name="iconoUrl" placeholder="https://res.cloudinary.com/.../icono.png" />
                    <label class="label"><span class="label-text-alt text-base-content/50">Usado como marca compacta si no hay logo.</span></label>
                  </div>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div class="form-control">
                    <label class="label"><span class="label-text">Color primario</span></label>
                    <div class="flex items-center gap-2">
                      <input
                        type="color"
                        class="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-base-300 bg-base-100 p-1"
                        [value]="colorPrimario() || COLOR_PRIMARIO_DEFECTO"
                        (input)="colorPrimario.set($any($event.target).value)"
                      />
                      <input
                        type="text"
                        class="input input-bordered w-full"
                        [ngModel]="colorPrimario()"
                        (ngModelChange)="colorPrimario.set($event)"
                        name="colorPrimario"
                        placeholder="#A9762F (vacío = por defecto)"
                      />
                    </div>
                  </div>
                  <div class="form-control">
                    <label class="label"><span class="label-text">Color secundario</span></label>
                    <div class="flex items-center gap-2">
                      <input
                        type="color"
                        class="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-base-300 bg-base-100 p-1"
                        [value]="colorSecundario() || COLOR_SECUNDARIO_DEFECTO"
                        (input)="colorSecundario.set($any($event.target).value)"
                      />
                      <input
                        type="text"
                        class="input input-bordered w-full"
                        [ngModel]="colorSecundario()"
                        (ngModelChange)="colorSecundario.set($event)"
                        name="colorSecundario"
                        placeholder="#7A2E2E (vacío = por defecto)"
                      />
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-3 pt-2">
                  <button type="submit" class="btn btn-primary gap-2" [disabled]="guardando()">
                    @if (guardando()) {
                      <app-icon name="loader" [size]="18" className="animate-spin-slow" />
                    } @else {
                      <app-icon name="check" [size]="18" />
                    }
                    {{ guardando() ? 'Guardando...' : 'Guardar cambios' }}
                  </button>
                  <button type="button" class="btn btn-ghost" (click)="restablecer()" [disabled]="guardando()">
                    Restablecer valores por defecto
                  </button>
                </div>

                @if (mensaje()) {
                  <div class="alert" [class.alert-success]="exito()" [class.alert-error]="!exito()">
                    <app-icon [name]="exito() ? 'check-circle' : 'alert-circle'" [size]="18" />
                    <span>{{ mensaje() }}</span>
                  </div>
                }
              </form>
            }
          </div>
        </div>

        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg">Vista previa</h2>
            <p class="text-sm text-base-content/60">Así se ve en la barra lateral.</p>
            <div class="mt-4 flex items-center gap-3 rounded-lg bg-neutral p-4 text-neutral-content">
              <app-brand-mark />
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class BrandingConfigComponent implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly brandingService = inject(BrandingService);

  readonly COLOR_PRIMARIO_DEFECTO = COLOR_PRIMARIO_DEFECTO;
  readonly COLOR_SECUNDARIO_DEFECTO = COLOR_SECUNDARIO_DEFECTO;

  loading = signal(true);
  guardando = signal(false);
  mensaje = signal('');
  exito = signal(false);

  nombre = '';
  logoUrl = '';
  iconoUrl = '';
  colorPrimario = signal('');
  colorSecundario = signal('');

  ngOnInit(): void {
    this.configuracionService.getBranding().subscribe({
      next: (data) => {
        this.nombre = data.nombre;
        this.logoUrl = data.logoUrl ?? '';
        this.iconoUrl = data.iconoUrl ?? '';
        this.colorPrimario.set(data.colorPrimario ?? '');
        this.colorSecundario.set(data.colorSecundario ?? '');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  guardar(): void {
    this.guardando.set(true);
    this.mensaje.set('');

    this.configuracionService
      .updateBranding({
        nombre: this.nombre,
        logoUrl: this.logoUrl,
        iconoUrl: this.iconoUrl,
        colorPrimario: this.colorPrimario(),
        colorSecundario: this.colorSecundario(),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.exito.set(true);
          this.mensaje.set('Cambios guardados correctamente');
          this.brandingService.refresh();
        },
        error: (err) => {
          this.guardando.set(false);
          this.exito.set(false);
          this.mensaje.set(err?.error?.message?.[0] || err?.error?.message || 'Error al guardar los cambios');
        },
      });
  }

  restablecer(): void {
    this.nombre = 'Peluquería';
    this.logoUrl = '';
    this.iconoUrl = '';
    this.colorPrimario.set('');
    this.colorSecundario.set('');
  }
}
