import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { ConfiguracionNegocio } from '../../shared/models/configuracion.model';
import { ProductosService } from '../../shared/services/productos.service';
import { Producto } from '../../shared/models/producto.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { whatsappLinkConMensaje } from '../../shared/utils/whatsapp.util';

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [RouterLink, IconComponent, BrandMarkComponent, PesosPipe],
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

      <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div class="mb-8 text-center">
          <h1 class="font-display text-3xl font-semibold">{{ config().productosTitulo || 'Nuestros productos' }}</h1>
          @if (config().productosDescripcion; as descripcion) {
            <p class="mx-auto mt-2 max-w-2xl whitespace-pre-line text-base-content/70">{{ descripcion }}</p>
          }
        </div>

        @if (cargando()) {
          <div class="flex items-center justify-center gap-2 py-16">
            <app-icon name="loader" [size]="20" className="animate-spin" />
            <span class="text-base-content/70">Cargando...</span>
          </div>
        } @else if (productos().length === 0) {
          <p class="py-16 text-center text-base-content/60">Todavía no hay productos cargados.</p>
        } @else {
          <div class="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            @for (producto of productos(); track producto.idProducto) {
              <div class="group overflow-hidden rounded-2xl bg-base-100 shadow-sm transition-shadow duration-300 ease-out hover:shadow-xl">
                <figure class="relative aspect-square overflow-hidden bg-base-200">
                  @if (producto.urlImagen) {
                    <img
                      [src]="producto.urlImagen"
                      [alt]="producto.nombre"
                      loading="lazy"
                      class="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-110"
                    />
                  } @else {
                    <div class="flex h-full w-full items-center justify-center text-base-content/25">
                      <app-icon name="shopping-bag" [size]="40" />
                    </div>
                  }
                  @if (producto.categoria?.nombre; as categoria) {
                    <span class="absolute left-3 top-3 rounded-full bg-neutral/90 px-3 py-1 text-[11px] font-medium tracking-wide text-neutral-content backdrop-blur-sm">
                      {{ categoria }}
                    </span>
                  }
                </figure>
                <div class="px-1 pt-4">
                  <h2 class="font-display text-lg font-semibold leading-snug">{{ producto.nombre }}</h2>
                  @if (producto.descripcion) {
                    <p class="mt-1 line-clamp-2 text-sm text-base-content/60">{{ producto.descripcion }}</p>
                  }
                  <div class="mt-4 flex items-center justify-between gap-3">
                    <span class="font-display text-lg font-semibold text-primary">{{ producto.precio | pesos }}</span>
                    @if (config().whatsappUrl; as url) {
                      <a [href]="whatsappHref(url, producto)" target="_blank" rel="noopener" class="btn btn-primary btn-sm gap-2">
                        <app-icon name="whatsapp" [size]="16" />
                        Consultar
                      </a>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <footer class="border-t border-base-300 py-8 text-center text-sm text-base-content/60">
        © {{ currentYear }} {{ config().nombre }}
      </footer>
    </div>
  `,
})
export class TiendaComponent implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly productosService = inject(ProductosService);

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
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.configuracionService.getBranding().subscribe({
      next: (data) => this.config.set(data),
      error: () => {},
    });
    this.productosService.findAll(true, undefined, 1, 100).subscribe({
      next: (res) => {
        this.productos.set(res.data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  whatsappHref(baseUrl: string, producto: Producto): string {
    const mensaje = `Hola! Quiero consultar por el producto "${producto.nombre}"`;
    return whatsappLinkConMensaje(baseUrl, mensaje);
  }
}
