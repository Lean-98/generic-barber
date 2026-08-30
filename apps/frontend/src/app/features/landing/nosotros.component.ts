import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { ClaveBloqueSobreNosotros, ConfiguracionNegocio } from '../../shared/models/configuracion.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';

const ICONO_POR_CLAVE: Record<ClaveBloqueSobreNosotros, string> = {
  quienesSomos: 'users',
  nuestraHistoria: 'book-open',
  mision: 'trending-up',
  valores: 'star',
};

@Component({
  selector: 'app-nosotros',
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

      <section
        class="relative overflow-hidden bg-neutral py-16 text-neutral-content sm:py-24"
        [style.background-image]="config().heroImageUrl ? 'url(' + config().heroImageUrl + ')' : null"
        style="background-size: cover; background-position: center;"
      >
        <div class="absolute inset-0 bg-neutral/80"></div>
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent"></div>
        <div class="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 class="font-display text-4xl font-semibold sm:text-5xl">Nosotros</h1>
          @if (config().sobreNosotrosBajada; as bajada) {
            <p class="mx-auto mt-3 max-w-xl text-neutral-content/70">{{ bajada }}</p>
          }
        </div>
      </section>

      <div class="relative z-10 mx-auto -mt-10 max-w-4xl px-4 pb-16 sm:px-6">
        @if (cargando()) {
          <div class="flex items-center justify-center gap-2 py-16">
            <app-icon name="loader" [size]="20" className="animate-spin" />
            <span class="text-base-content/70">Cargando...</span>
          </div>
        } @else if (bloques().length === 0) {
          <p class="rounded-xl border border-base-300 bg-base-100 py-16 text-center text-base-content/60 shadow-sm">
            Todavía no hay contenido cargado.
          </p>
        } @else {
          <div class="space-y-6">
            @if (destacado(); as bloque) {
              <div class="card border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body gap-4 sm:flex-row sm:items-center">
                  <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content">
                    <app-icon [name]="bloque.icono" [size]="28" />
                  </div>
                  <div>
                    <h2 class="font-display text-2xl font-semibold">{{ bloque.titulo }}</h2>
                    <p class="mt-2 whitespace-pre-line text-base-content/70">{{ bloque.descripcion }}</p>
                  </div>
                </div>
              </div>
            }
            @if (resto().length > 0) {
              <div class="grid gap-6 sm:grid-cols-3">
                @for (bloque of resto(); track bloque.clave) {
                  <div class="card border border-base-300 bg-base-100 shadow-sm transition-shadow hover:shadow-md">
                    <div class="card-body">
                      <div class="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-content">
                        <app-icon [name]="bloque.icono" [size]="20" />
                      </div>
                      <h2 class="font-display card-title text-lg">{{ bloque.titulo }}</h2>
                      <p class="whitespace-pre-line text-sm text-base-content/70">{{ bloque.descripcion }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <footer class="border-t border-base-300 py-8 text-center text-sm text-base-content/50">
        © {{ currentYear }} {{ config().nombre }}
      </footer>
    </div>
  `,
})
export class NosotrosComponent implements OnInit {
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
    clubNombre: null,
    clubBajada: null,
    clubImagenUrl: null,
    clubBeneficios: null,
    clubNota: null,
    mostrarNosotros: true,
    mostrarClub: true,
    mostrarTienda: true,
    mostrarCursos: true,
    mostrarServicios: true,
    mostrarGaleria: true,
    mostrarUbicacion: true,
    fidelizacionActiva: false,
    fidelizacionVisitasRequeridas: null,
    fidelizacionDescuentoPorcentaje: null,
    fidelizacionFechaInicio: null,
    descuentoEmpleadoActivo: false,
    descuentoEmpleadoPorcentaje: null,
  });
  cargando = signal(true);
  currentYear = new Date().getFullYear();

  bloques = computed(() =>
    (this.config().sobreNosotros ?? [])
      .filter((b) => !!b.descripcion?.trim())
      .map((b) => ({ ...b, icono: ICONO_POR_CLAVE[b.clave] })),
  );
  destacado = computed(() => this.bloques()[0]);
  resto = computed(() => this.bloques().slice(1));

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
