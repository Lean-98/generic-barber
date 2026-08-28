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
        <div class="navbar-start min-w-0 gap-3">
          <a routerLink="/" class="flex min-w-0 items-center gap-3">
            <app-brand-mark [hero]="true" barHeight="h-8" nameClass="hidden truncate sm:inline" />
          </a>
        </div>
        <div class="navbar-end shrink-0 gap-2 sm:gap-4">
          <a routerLink="/" class="btn btn-ghost btn-sm gap-2">
            <app-icon name="arrow-left" [size]="16" />
            <span class="hidden sm:inline">Volver</span>
          </a>
          <a routerLink="/reservar" class="btn btn-primary btn-sm gap-2">
            <app-icon name="calendar" [size]="16" />
            Reservar
          </a>
        </div>
      </header>

      <section class="relative overflow-hidden bg-neutral py-16 text-neutral-content sm:py-20">
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent"></div>
        <div class="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 class="font-display text-4xl font-semibold sm:text-5xl">
            {{ config().authenticClubNombre }} <span class="text-primary">Club</span>
          </h1>
          @if (config().authenticClubBajada; as bajada) {
            <p class="mx-auto mt-3 max-w-xl text-neutral-content/70">{{ bajada }}</p>
          }

          @if (!cargando() && config().authenticClubImagenUrl) {
            <div class="mt-8 flex justify-center">
              <img
                [src]="config().authenticClubImagenUrl"
                [alt]="'Tarjeta ' + nombreClub()"
                class="w-full max-w-md rounded-2xl border border-primary/30 shadow-xl transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.02] motion-safe:hover:border-primary/60 motion-safe:hover:shadow-2xl"
              />
            </div>
          }
        </div>
      </section>

      <div class="relative z-10 mx-auto -mt-10 max-w-4xl px-4 pb-16 sm:px-6">
        @if (cargando()) {
          <div class="flex items-center justify-center gap-2 py-16">
            <app-icon name="loader" [size]="20" className="animate-spin" />
            <span class="text-base-content/70">Cargando...</span>
          </div>
        } @else {
          @if (beneficios().length === 0) {
            <p class="rounded-xl border border-base-300 bg-base-100 py-16 text-center text-base-content/60 shadow-sm">
              Todavía no hay beneficios cargados.
            </p>
          } @else {
            <div class="grid gap-6 sm:grid-cols-2">
              @for (beneficio of beneficios(); track beneficio.clave) {
                <div class="card border border-base-300 bg-base-100 shadow-sm transition-shadow hover:shadow-md">
                  <div class="card-body">
                    <div class="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-content">
                      <app-icon [name]="beneficio.icono" [size]="20" />
                    </div>
                    <h2 class="font-display card-title text-lg">{{ beneficio.titulo }}</h2>
                    <p class="text-sm text-base-content/70">{{ beneficio.descripcion }}</p>
                  </div>
                </div>
              }
            </div>
          }

          @if (config().authenticClubNota; as nota) {
            <div class="mt-10 flex items-center gap-3 rounded-xl border border-base-300 bg-base-200/60 p-4 text-sm text-base-content/70">
              <app-icon name="scissors" [size]="18" className="shrink-0 text-primary" />
              {{ nota }}
            </div>
          }
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
    sobreNosotrosBajada: null,
    authenticClubNombre: null,
    authenticClubBajada: null,
    authenticClubImagenUrl: null,
    authenticClubBeneficios: null,
    authenticClubNota: null,
    mostrarNosotros: true,
    mostrarAuthenticClub: true,
    mostrarTienda: true,
    mostrarCursos: true,
    mostrarServicios: true,
    mostrarGaleria: true,
    mostrarUbicacion: true,
  });
  cargando = signal(true);
  currentYear = new Date().getFullYear();

  nombreClub = computed(() => {
    const nombre = this.config().authenticClubNombre?.trim();
    return nombre ? `${nombre} Club` : 'Club';
  });

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
