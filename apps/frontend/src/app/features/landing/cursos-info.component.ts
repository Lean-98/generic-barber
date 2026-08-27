import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { ConfiguracionNegocio } from '../../shared/models/configuracion.model';
import { CursosService } from '../../shared/services/cursos.service';
import { Curso } from '../../shared/models/curso.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { whatsappLinkConMensaje } from '../../shared/utils/whatsapp.util';

@Component({
  selector: 'app-cursos-info',
  standalone: true,
  imports: [RouterLink, IconComponent, BrandMarkComponent, PesosPipe, DatePipe],
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
          <h1 class="font-display text-3xl font-semibold">{{ config().cursosTitulo || 'Nuestros cursos' }}</h1>
          @if (config().cursosDescripcion; as descripcion) {
            <p class="mx-auto mt-2 max-w-2xl whitespace-pre-line text-base-content/70">{{ descripcion }}</p>
          }
        </div>

        @if (cargando()) {
          <div class="flex items-center justify-center gap-2 py-16">
            <app-icon name="loader" [size]="20" className="animate-spin" />
            <span class="text-base-content/70">Cargando...</span>
          </div>
        } @else if (cursos().length === 0) {
          <p class="py-16 text-center text-base-content/60">Todavía no hay cursos cargados.</p>
        } @else {
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            @for (curso of cursos(); track curso.idCurso) {
              <div class="card border border-base-300 bg-base-100 shadow-sm">
                @if (curso.urlImagen) {
                  <figure class="aspect-video overflow-hidden bg-base-200">
                    <img [src]="curso.urlImagen" [alt]="curso.nombre" class="h-full w-full object-cover" loading="lazy" />
                  </figure>
                } @else {
                  <figure class="flex aspect-video items-center justify-center bg-base-200 text-base-content/30">
                    <app-icon name="book-open" [size]="40" />
                  </figure>
                }
                <div class="card-body">
                  <h2 class="card-title text-base">{{ curso.nombre }}</h2>
                  @if (curso.subtitulo) {
                    <p class="-mt-1 text-sm font-medium text-primary">{{ curso.subtitulo }}</p>
                  }
                  @if (curso.descripcion) {
                    <p class="line-clamp-3 text-sm text-base-content/60">{{ curso.descripcion }}</p>
                  }

                  @if (curso.temario?.length) {
                    <ul class="mt-1 space-y-1 text-sm text-base-content/70">
                      @for (item of curso.temario!.slice(0, 5); track item) {
                        <li class="flex items-start gap-1.5">
                          <app-icon name="check-circle" [size]="14" className="mt-0.5 shrink-0 text-primary" />
                          <span>{{ item }}</span>
                        </li>
                      }
                    </ul>
                  }

                  @if (curso.requisitoImportante) {
                    <div class="mt-2 flex items-start gap-2 rounded-lg bg-warning/10 p-2.5 text-xs text-warning-content">
                      <app-icon name="alert-circle" [size]="14" className="mt-0.5 shrink-0 text-warning" />
                      <span>{{ curso.requisitoImportante }}</span>
                    </div>
                  }

                  <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-base-content/60">
                    @if (curso.fechaInicio && curso.fechaFin) {
                      <span class="col-span-2 flex items-center gap-1.5">
                        <app-icon name="calendar" [size]="13" />
                        {{ curso.fechaInicio | date: 'd MMM' }} al {{ curso.fechaFin | date: 'd MMM' }}
                      </span>
                    } @else if (curso.fechaInicio) {
                      <span class="flex items-center gap-1.5">
                        <app-icon name="calendar" [size]="13" />
                        Inicio: {{ curso.fechaInicio | date: 'd MMM' }}
                      </span>
                    } @else if (curso.fechaFin) {
                      <span class="flex items-center gap-1.5">
                        <app-icon name="calendar" [size]="13" />
                        Hasta: {{ curso.fechaFin | date: 'd MMM' }}
                      </span>
                    }
                    @if (curso.duracion) {
                      <span class="flex items-center gap-1.5"><app-icon name="clock" [size]="13" />{{ curso.duracion }}</span>
                    }
                    @if (curso.diaCursada?.length) {
                      <span class="flex items-center gap-1.5"><app-icon name="calendar" [size]="13" />{{ curso.diaCursada!.join(', ') }}</span>
                    }
                    @if (curso.horario) {
                      <span class="flex items-center gap-1.5"><app-icon name="clock" [size]="13" />{{ curso.horario }}</span>
                    }
                    @if (curso.lugar) {
                      <span class="col-span-2 flex items-center gap-1.5"><app-icon name="map-pin" [size]="13" />{{ curso.lugar }}</span>
                    }
                    @if (curso.cupos) {
                      <span class="col-span-2 flex items-center gap-1.5"><app-icon name="users" [size]="13" />Cupos limitados: {{ curso.cupos }}</span>
                    }
                    @if (curso.inscripcionInicio && curso.inscripcionHasta) {
                      <span class="col-span-2 flex items-center gap-1.5 font-medium text-primary">
                        <app-icon name="alert-circle" [size]="13" />
                        Inscripción del {{ curso.inscripcionInicio | date: 'd MMM' }} al {{ curso.inscripcionHasta | date: 'd MMM' }}
                      </span>
                    } @else if (curso.inscripcionHasta) {
                      <span class="col-span-2 flex items-center gap-1.5 font-medium text-primary">
                        <app-icon name="alert-circle" [size]="13" />
                        Inscribite antes del {{ curso.inscripcionHasta | date: 'd MMM' }}
                      </span>
                    } @else if (curso.inscripcionInicio) {
                      <span class="col-span-2 flex items-center gap-1.5 font-medium text-primary">
                        <app-icon name="alert-circle" [size]="13" />
                        Inscripción abierta desde el {{ curso.inscripcionInicio | date: 'd MMM' }}
                      </span>
                    }
                  </div>

                  <div class="card-actions mt-2 items-center justify-between">
                    <span class="text-lg font-semibold text-primary">{{ curso.precio | pesos }}</span>
                    @if (config().whatsappUrl; as url) {
                      <a [href]="whatsappHref(url, curso)" target="_blank" rel="noopener" class="btn btn-primary btn-sm gap-2">
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
export class CursosInfoComponent implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly cursosService = inject(CursosService);

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
  });
  cursos = signal<Curso[]>([]);
  cargando = signal(true);
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.configuracionService.getBranding().subscribe({
      next: (data) => this.config.set(data),
      error: () => {},
    });
    this.cursosService.findAll(true, 1, 100).subscribe({
      next: (res) => {
        this.cursos.set(res.data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  whatsappHref(baseUrl: string, curso: Curso): string {
    const mensaje = `Hola! Quiero consultar por el curso "${curso.nombre}"`;
    return whatsappLinkConMensaje(baseUrl, mensaje);
  }
}
