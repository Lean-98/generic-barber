import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { ClaveBloqueAuthenticClub, ConfiguracionNegocio } from '../../shared/models/configuracion.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';

const ICONO_POR_CLAVE: Record<ClaveBloqueAuthenticClub, string> = {
  presentarTarjeta: 'credit-card',
  empresa: 'bar-chart',
  cumpleanos: 'star',
  recomendar: 'users',
};

@Component({
  selector: 'app-authentic-club',
  standalone: true,
  imports: [RouterLink, IconComponent, BrandMarkComponent],
  template: `
    <div class="min-h-screen bg-base-100 text-base-content">
      <header class="navbar sticky top-0 z-40 bg-neutral px-4 text-neutral-content sm:px-6">
        <div class="navbar-start gap-3">
          <a routerLink="/" class="flex items-center gap-3">
            <app-brand-mark [hero]="true" barHeight="h-8" />
          </a>
        </div>
        <div class="navbar-end gap-4">
          <a routerLink="/" class="btn btn-ghost btn-sm gap-2">
            <app-icon name="arrow-left" [size]="16" />
            Volver
          </a>
          <a routerLink="/reservar" class="btn btn-primary btn-sm gap-2">
            <app-icon name="calendar" [size]="16" />
            Reservar
          </a>
        </div>
      </header>

      <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div class="mb-8 text-center">
          <h1 class="font-display text-3xl font-semibold">Authentic Club</h1>
          <p class="mt-2 text-base-content/70">Más cortes. Más beneficios. Más Authentic.</p>
        </div>

        @if (cargando()) {
          <div class="flex items-center justify-center gap-2 py-16">
            <app-icon name="loader" [size]="20" className="animate-spin" />
            <span class="text-base-content/70">Cargando...</span>
          </div>
        } @else {
          @if (config().authenticClubImagenUrl) {
            <div class="mb-10 flex justify-center">
              <img
                [src]="config().authenticClubImagenUrl"
                alt="Tarjeta Authentic Club"
                class="w-full max-w-md rounded-2xl shadow-lg"
              />
            </div>
          }

          @if (beneficios().length === 0) {
            <p class="py-16 text-center text-base-content/60">Todavía no hay beneficios cargados.</p>
          } @else {
            <div class="grid gap-6 sm:grid-cols-2">
              @for (beneficio of beneficios(); track beneficio.clave) {
                <div class="card border border-base-300 bg-base-100 shadow-sm">
                  <div class="card-body">
                    <div class="mb-2 flex items-center gap-3">
                      <div class="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 text-primary">
                        <app-icon [name]="beneficio.icono" [size]="18" />
                      </div>
                      <h2 class="card-title text-base">{{ beneficio.titulo }}</h2>
                    </div>
                    <p class="text-sm text-base-content/70">{{ beneficio.descripcion }}</p>
                  </div>
                </div>
              }
            </div>
          }

          <p class="mt-10 text-center text-sm text-base-content/60">
            Pedí tu tarjeta Authentic Club en el local. Es gratuita y con cada corte sumás un sello.
          </p>
        }
      </div>

      <footer class="border-t border-base-300 py-8 text-center text-sm text-base-content/50">
        © {{ currentYear }} {{ config().nombre }}
      </footer>
    </div>
  `,
})
export class AuthenticClubComponent implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);

  config = signal<ConfiguracionNegocio>({
    nombre: 'Peluquería',
    logoUrl: null,
    iconoUrl: null,
    colorPrimario: null,
    colorSecundario: null,
    heroImageUrl: null,
    descripcion: null,
    telefono: null,
    email: null,
    direccion: null,
    instagramUrl: null,
    facebookUrl: null,
    googleReviewsUrl: null,
    whatsappUrl: null,
    politicaReservas: null,
    horarios: null,
    galeriaUrls: null,
    productosTitulo: null,
    productosDescripcion: null,
    cursosTitulo: null,
    cursosDescripcion: null,
    sobreNosotros: null,
    authenticClubImagenUrl: null,
    authenticClubBeneficios: null,
  });
  cargando = signal(true);
  currentYear = new Date().getFullYear();

  beneficios = computed(() =>
    (this.config().authenticClubBeneficios ?? [])
      .filter((b) => !!b.descripcion?.trim())
      .map((b) => ({ ...b, icono: ICONO_POR_CLAVE[b.clave] })),
  );

  ngOnInit(): void {
    this.configuracionService.getBranding().subscribe({
      next: (data) => {
        this.config.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
