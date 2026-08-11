import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { ConfiguracionNegocio } from '../../shared/models/configuracion.model';
import { ServiciosService } from '../../shared/services/servicios.service';
import { Servicio } from '../../shared/models/servicio.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';

const DIAS_ORDEN: { dia: number; nombre: string }[] = [
  { dia: 1, nombre: 'Lunes' },
  { dia: 2, nombre: 'Martes' },
  { dia: 3, nombre: 'Miércoles' },
  { dia: 4, nombre: 'Jueves' },
  { dia: 5, nombre: 'Viernes' },
  { dia: 6, nombre: 'Sábado' },
  { dia: 0, nombre: 'Domingo' },
];

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, IconComponent, BrandMarkComponent, PesosPipe],
  template: `
    <div class="min-h-screen bg-base-100 text-base-content">
      <!-- Header -->
      <header class="sticky top-0 z-40 border-b border-base-300 bg-base-100/90 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <app-brand-mark [hero]="true" barHeight="h-9" />
          <nav class="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#servicios" class="hover:text-primary">Servicios</a>
            <a href="#horarios" class="hover:text-primary">Horarios</a>
            @if (galeriaItems().length > 0) {
              <a href="#galeria" class="hover:text-primary">Galería</a>
            }
            @if (config().direccion) {
              <a href="#ubicacion" class="hover:text-primary">Ubicación</a>
            }
          </nav>
          <a routerLink="/reservar" class="btn btn-primary btn-sm gap-2">
            <app-icon name="calendar" [size]="16" />
            Reservar
          </a>
        </div>
      </header>

      <!-- Hero -->
      <section
        class="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-neutral text-neutral-content"
        [style.background-image]="config().heroImageUrl ? 'url(' + config().heroImageUrl + ')' : null"
        style="background-size: cover; background-position: center;"
      >
        <div class="absolute inset-0 bg-neutral/70"></div>
        <div class="relative z-10 mx-auto max-w-2xl px-4 py-20 text-center">
          <p class="text-sm font-medium uppercase tracking-[0.2em] text-primary">{{ config().nombre }}</p>
          <h1 class="font-display mt-3 text-4xl font-medium leading-tight tracking-tight md:text-5xl">
            {{ config().descripcion ? tituloCorto() : 'Reservá tu turno en minutos' }}
          </h1>
          @if (config().descripcion) {
            <p class="mt-4 text-neutral-content/70">{{ config().descripcion }}</p>
          }
          <a routerLink="/reservar" class="btn btn-primary btn-lg mt-8 gap-2">
            <app-icon name="calendar" [size]="20" />
            Reservar turno
          </a>
        </div>
      </section>

      <!-- Servicios -->
      <section id="servicios" class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 class="font-display text-2xl font-medium tracking-tight md:text-3xl">Servicios</h2>
        <p class="mt-2 text-base-content/60">Lo que ofrecemos en {{ config().nombre }}</p>

        @if (servicios().length > 0) {
          <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (servicio of servicios(); track servicio.idServicio) {
              <div class="card border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body p-5">
                  <p class="font-semibold">{{ servicio.nombre }}</p>
                  <div class="mt-1 flex items-center justify-between">
                    <span class="flex items-center gap-1 text-sm text-base-content/60">
                      <app-icon name="clock" [size]="14" />
                      {{ servicio.duracionMinutos }} min
                    </span>
                    <span class="tabular-nums font-semibold text-primary">{{ servicio.precio | pesos }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="mt-8 text-base-content/60">Todavía no hay servicios cargados.</p>
        }
      </section>

      <!-- Horarios -->
      <section id="horarios" class="bg-base-200">
        <div class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div class="grid gap-8 md:grid-cols-2">
            <div>
              <h2 class="font-display text-2xl font-medium tracking-tight md:text-3xl">Horarios</h2>
              @if (estaAbierto(); as abierto) {
                <span class="badge mt-3 gap-1" [class.badge-success]="abierto.abierto" [class.badge-ghost]="!abierto.abierto">
                  {{ abierto.abierto ? 'Abierto ahora' : 'Cerrado ahora' }}
                </span>
              }
              <div class="mt-6 divide-y divide-base-300 rounded-lg border border-base-300 bg-base-100">
                @for (fila of filasHorario(); track fila.dia) {
                  <div class="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span [class.font-semibold]="fila.esHoy">{{ fila.nombre }}</span>
                    <span [class.font-semibold]="fila.esHoy" [class.text-base-content]="!fila.cerrado" [class.opacity-50]="fila.cerrado">
                      {{ fila.cerrado ? 'Cerrado' : fila.abre + ' - ' + fila.cierra }}
                    </span>
                  </div>
                }
              </div>
            </div>

            @if (config().telefono || config().email || config().whatsappUrl || config().instagramUrl || config().facebookUrl || config().googleReviewsUrl) {
              <div>
                <h2 class="font-display text-2xl font-medium tracking-tight md:text-3xl">Contacto</h2>
                <div class="mt-6 space-y-3">
                  @if (config().whatsappUrl; as url) {
                    <a [href]="url" target="_blank" rel="noopener" class="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 px-4 py-3 hover:border-primary">
                      <app-icon name="whatsapp" [size]="18" className="text-primary" />
                      <span>Escribinos por WhatsApp</span>
                    </a>
                  }
                  @if (config().telefono; as telefono) {
                    <a [href]="'tel:' + telefono" class="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 px-4 py-3 hover:border-primary">
                      <app-icon name="phone" [size]="18" className="text-primary" />
                      <span>{{ telefono }}</span>
                    </a>
                  }
                  @if (config().email; as email) {
                    <a [href]="'mailto:' + email" class="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 px-4 py-3 hover:border-primary">
                      <app-icon name="mail" [size]="18" className="text-primary" />
                      <span>{{ email }}</span>
                    </a>
                  }
                  @if (config().googleReviewsUrl; as url) {
                    <a [href]="url" target="_blank" rel="noopener" class="flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 px-4 py-3 hover:border-primary">
                      <app-icon name="star" [size]="18" className="text-primary" />
                      <span>Dejanos tu reseña en Google</span>
                    </a>
                  }
                  @if (config().instagramUrl || config().facebookUrl) {
                    <div class="flex items-center gap-3 pt-2">
                      @if (config().instagramUrl; as url) {
                        <a [href]="url" target="_blank" rel="noopener" class="btn btn-ghost btn-square" aria-label="Instagram">
                          <app-icon name="instagram" [size]="20" />
                        </a>
                      }
                      @if (config().facebookUrl; as url) {
                        <a [href]="url" target="_blank" rel="noopener" class="btn btn-ghost btn-square" aria-label="Facebook">
                          <app-icon name="facebook" [size]="20" />
                        </a>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Galería -->
      @if (galeriaItems().length > 0) {
        <section id="galeria" class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 class="font-display text-2xl font-medium tracking-tight md:text-3xl">Galería</h2>

          <div
            class="carousel mt-8 w-full rounded-lg"
            (mouseenter)="pausarAutoplayGaleria()"
            (mouseleave)="reanudarAutoplayGaleria($event)"
          >
            @for (item of galeriaItems(); track item.id) {
              <div [id]="item.id" class="carousel-item relative w-full">
                <img [src]="item.url" alt="" class="aspect-video w-full object-cover" loading="lazy" />
                @if (galeriaItems().length > 1) {
                  <div class="absolute left-2 right-2 top-1/2 flex -translate-y-1/2 justify-between">
                    <a [href]="'#' + item.prevId" class="btn btn-circle btn-sm bg-base-100/80 border-none">❮</a>
                    <a [href]="'#' + item.nextId" class="btn btn-circle btn-sm bg-base-100/80 border-none">❯</a>
                  </div>
                }
              </div>
            }
          </div>

          @if (galeriaItems().length > 1) {
            <div class="mt-3 flex justify-center gap-2">
              @for (item of galeriaItems(); track item.id; let i = $index) {
                <a [href]="'#' + item.id" class="btn btn-xs btn-circle btn-ghost">{{ i + 1 }}</a>
              }
            </div>
          }
        </section>
      }

      <!-- Ubicación -->
      @if (config().direccion) {
        <section id="ubicacion" class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 class="font-display text-2xl font-medium tracking-tight md:text-3xl">Ubicación</h2>
          <p class="mt-2 flex items-center gap-2 text-base-content/70">
            <app-icon name="map-pin" [size]="18" />
            {{ config().direccion }}
          </p>
          @if (mapaUrl(); as url) {
            <div class="mt-6 overflow-hidden rounded-lg border border-base-300">
              <iframe [src]="url" width="100%" height="360" style="border:0" loading="lazy" title="Ubicación"></iframe>
            </div>
          }
        </section>
      }

      <!-- Política de reservas -->
      @if (config().politicaReservas) {
        <section class="bg-base-200">
          <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 class="font-display text-xl font-medium tracking-tight">Política de reservas</h2>
            <p class="mt-3 whitespace-pre-line text-base-content/70">{{ config().politicaReservas }}</p>
          </div>
        </section>
      }

      <!-- Footer -->
      <footer class="border-t border-base-300 py-8 text-center text-sm text-base-content/50">
        © {{ currentYear }} {{ config().nombre }}
      </footer>

      <!-- WhatsApp flotante -->
      @if (config().whatsappUrl; as url) {
        <a
          [href]="url"
          target="_blank"
          rel="noopener"
          class="btn btn-circle btn-lg fixed bottom-6 right-6 z-40 bg-[#25D366] text-white shadow-lg hover:bg-[#1ebe5a] border-none"
          aria-label="Escribinos por WhatsApp"
        >
          <app-icon name="whatsapp" [size]="26" />
        </a>
      }
    </div>
  `,
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly serviciosService = inject(ServiciosService);
  private readonly sanitizer = inject(DomSanitizer);
  private autoplayIntervalId: ReturnType<typeof setInterval> | null = null;
  private indiceGaleriaActual = 0;

  constructor() {
    // Reinicia el autoplay cuando cambia la cantidad de fotos (ej. al cargar los datos).
    effect(() => {
      const cantidad = this.galeriaItems().length;
      this.detenerAutoplayGaleria();
      if (cantidad > 1) {
        this.iniciarAutoplayGaleria(cantidad);
      }
    });
  }

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
  });
  servicios = signal<Servicio[]>([]);
  currentYear = new Date().getFullYear();

  tituloCorto = computed(() => `Bienvenido a ${this.config().nombre}`);

  filasHorario = computed(() => {
    const horarios = this.config().horarios;
    const hoy = new Date().getDay();
    return DIAS_ORDEN.map(({ dia, nombre }) => {
      const existente = horarios?.find((h) => h.dia === dia);
      return {
        dia,
        nombre,
        cerrado: existente?.cerrado ?? true,
        abre: existente?.abre ?? '',
        cierra: existente?.cierra ?? '',
        esHoy: dia === hoy,
      };
    });
  });

  estaAbierto = computed<{ abierto: boolean } | null>(() => {
    const horarios = this.config().horarios;
    if (!horarios || horarios.length === 0) return null;

    const ahora = new Date();
    const horaHoy = horarios.find((h) => h.dia === ahora.getDay());
    if (!horaHoy || horaHoy.cerrado || !horaHoy.abre || !horaHoy.cierra) {
      return { abierto: false };
    }

    const [horaApertura, minutoApertura] = horaHoy.abre.split(':').map(Number);
    const [horaCierre, minutoCierre] = horaHoy.cierra.split(':').map(Number);
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

    return {
      abierto: minutosAhora >= horaApertura * 60 + minutoApertura && minutosAhora < horaCierre * 60 + minutoCierre,
    };
  });

  galeriaItems = computed(() => {
    const fotos = this.config().galeriaUrls ?? [];
    return fotos.map((url, i) => ({
      url,
      id: `galeria-${i}`,
      prevId: `galeria-${(i - 1 + fotos.length) % fotos.length}`,
      nextId: `galeria-${(i + 1) % fotos.length}`,
    }));
  });

  mapaUrl = computed<SafeResourceUrl | null>(() => {
    const direccion = this.config().direccion;
    if (!direccion) return null;
    const url = `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  ngOnInit(): void {
    this.configuracionService.getBranding().subscribe({
      next: (data) => this.config.set(data),
      error: () => {},
    });
    this.serviciosService.findAll(true, undefined, 1, 200).subscribe((res) => this.servicios.set(res.data));
  }

  ngOnDestroy(): void {
    this.detenerAutoplayGaleria();
  }

  pausarAutoplayGaleria(): void {
    this.detenerAutoplayGaleria();
  }

  reanudarAutoplayGaleria(event: Event): void {
    const cantidad = this.galeriaItems().length;
    if (cantidad <= 1) return;

    const carousel = event.currentTarget as HTMLElement;
    const ancho = carousel.clientWidth || 1;
    this.indiceGaleriaActual = Math.round(carousel.scrollLeft / ancho) % cantidad;
    this.iniciarAutoplayGaleria(cantidad);
  }

  private iniciarAutoplayGaleria(cantidad: number): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    this.autoplayIntervalId = setInterval(() => {
      this.indiceGaleriaActual = (this.indiceGaleriaActual + 1) % cantidad;
      document.getElementById(`galeria-${this.indiceGaleriaActual}`)?.scrollIntoView({
        behavior: 'smooth',
        inline: 'start',
        block: 'nearest',
      });
    }, 4000);
  }

  private detenerAutoplayGaleria(): void {
    if (this.autoplayIntervalId) {
      clearInterval(this.autoplayIntervalId);
      this.autoplayIntervalId = null;
    }
  }
}
