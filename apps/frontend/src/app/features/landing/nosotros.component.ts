import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { ConfiguracionNegocio } from '../../shared/models/configuracion.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';

@Component({
  selector: 'app-nosotros',
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
          <h1 class="font-display text-3xl font-semibold">Nosotros</h1>
        </div>

        @if (cargando()) {
          <div class="flex items-center justify-center gap-2 py-16">
            <app-icon name="loader" [size]="20" className="animate-spin" />
            <span class="text-base-content/70">Cargando...</span>
          </div>
        } @else if (bloques().length === 0) {
          <p class="py-16 text-center text-base-content/60">Todavía no hay contenido cargado.</p>
        } @else {
          <div class="grid gap-6 sm:grid-cols-2">
            @for (bloque of bloques(); track bloque.clave) {
              <div class="card border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body">
                  <h2 class="card-title text-base">{{ bloque.titulo }}</h2>
                  <p class="whitespace-pre-line text-sm text-base-content/70">{{ bloque.descripcion }}</p>
                </div>
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
  });
  cargando = signal(true);
  currentYear = new Date().getFullYear();

  bloques = computed(() => (this.config().sobreNosotros ?? []).filter((b) => !!b.descripcion?.trim()));

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
