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
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            @for (producto of productos(); track producto.idProducto) {
              <div class="card border border-base-300 bg-base-100 shadow-sm">
                @if (producto.urlImagen) {
                  <figure class="aspect-square overflow-hidden bg-base-200">
                    <img [src]="producto.urlImagen" [alt]="producto.nombre" class="h-full w-full object-cover" loading="lazy" />
                  </figure>
                } @else {
                  <figure class="flex aspect-square items-center justify-center bg-base-200 text-base-content/30">
                    <app-icon name="shopping-bag" [size]="40" />
                  </figure>
                }
                <div class="card-body">
                  @if (producto.categoria?.nombre; as categoria) {
                    <span class="badge badge-outline badge-sm self-start">{{ categoria }}</span>
                  }
                  <h2 class="card-title text-base">{{ producto.nombre }}</h2>
                  @if (producto.descripcion) {
                    <p class="line-clamp-2 text-sm text-base-content/60">{{ producto.descripcion }}</p>
                  }
                  <div class="card-actions mt-2 items-center justify-between">
                    <span class="text-lg font-semibold text-primary">{{ producto.precio | pesos }}</span>
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

      <footer class="border-t border-base-300 py-8 text-center text-sm text-base-content/50">
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
