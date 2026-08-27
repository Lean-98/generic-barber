import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { ConfiguracionNegocio, HorarioDia } from '../../shared/models/configuracion.model';
import { ServiciosService } from '../../shared/services/servicios.service';
import { Servicio } from '../../shared/models/servicio.model';
import { ProductosService } from '../../shared/services/productos.service';
import { CursosService } from '../../shared/services/cursos.service';
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

/** Minutos desde medianoche de un "HH:mm". */
function minutosDe(horaHHmm: string): number {
  const [hora, minuto] = horaHHmm.split(':').map(Number);
  return hora * 60 + minuto;
}

/** Turnos del día (uno o dos, para horario partido), ordenados por hora de apertura. */
function rangosDe(horario: HorarioDia): { abre: string; cierra: string }[] {
  const rangos: { abre: string; cierra: string }[] = [];
  if (horario.abre && horario.cierra) rangos.push({ abre: horario.abre, cierra: horario.cierra });
  if (horario.abre2 && horario.cierra2) rangos.push({ abre: horario.abre2, cierra: horario.cierra2 });
  return rangos.sort((a, b) => minutosDe(a.abre) - minutosDe(b.abre));
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, IconComponent, BrandMarkComponent, PesosPipe],
  template: `
    <div class="min-h-screen bg-base-100 text-base-content">
      <!-- Header -->
      <header class="navbar sticky top-0 z-40 bg-neutral px-4 text-neutral-content sm:px-6">
        <div class="navbar-start gap-3">
          <button class="btn btn-ghost btn-square lg:hidden" (click)="menuAbierto.set(!menuAbierto())" aria-label="Menú">
            <app-icon [name]="menuAbierto() ? 'x' : 'menu'" [size]="20" />
          </button>
          <app-brand-mark [hero]="true" barHeight="h-8" />
        </div>
        <nav class="navbar-center hidden items-center gap-6 text-sm font-medium lg:flex">
          <a routerLink="/nosotros" class="opacity-80 hover:opacity-100">Nosotros</a>
          <a href="#servicios" class="opacity-80 hover:opacity-100">Servicios</a>
          @if (hayProductos()) {
            <a routerLink="/tienda" class="opacity-80 hover:opacity-100">Productos</a>
          }
          @if (hayCursos()) {
            <a routerLink="/cursos-info" class="opacity-80 hover:opacity-100">Cursos</a>
          }
          @if (galeriaItems().length > 0) {
            <a href="#galeria" class="opacity-80 hover:opacity-100">Galería</a>
          }
          @if (config().direccion) {
            <a href="#ubicacion" class="opacity-80 hover:opacity-100">Ubicación</a>
          }
        </nav>
        <div class="navbar-end gap-4">
          <a routerLink="/reservar" class="btn btn-primary btn-sm gap-2">
            <app-icon name="calendar" [size]="16" />
            Reservar
          </a>
        </div>
      </header>

      <!-- Menú mobile -->
      @if (menuAbierto()) {
        <div class="fixed inset-0 z-30 lg:hidden" (click)="menuAbierto.set(false)">
          <div class="absolute inset-0 bg-black/50"></div>
          <nav class="relative flex flex-col gap-1 bg-neutral px-4 py-3 text-neutral-content shadow-xl" (click)="$event.stopPropagation()">
            <a routerLink="/nosotros" class="rounded-md px-3 py-2.5 text-sm font-medium opacity-80 hover:bg-white/5 hover:opacity-100" (click)="menuAbierto.set(false)">Nosotros</a>
            <a href="#servicios" class="rounded-md px-3 py-2.5 text-sm font-medium opacity-80 hover:bg-white/5 hover:opacity-100" (click)="menuAbierto.set(false)">Servicios</a>
            @if (hayProductos()) {
              <a routerLink="/tienda" class="rounded-md px-3 py-2.5 text-sm font-medium opacity-80 hover:bg-white/5 hover:opacity-100" (click)="menuAbierto.set(false)">Productos</a>
            }
            @if (hayCursos()) {
              <a routerLink="/cursos-info" class="rounded-md px-3 py-2.5 text-sm font-medium opacity-80 hover:bg-white/5 hover:opacity-100" (click)="menuAbierto.set(false)">Cursos</a>
            }
            @if (galeriaItems().length > 0) {
              <a href="#galeria" class="rounded-md px-3 py-2.5 text-sm font-medium opacity-80 hover:bg-white/5 hover:opacity-100" (click)="menuAbierto.set(false)">Galería</a>
            }
            @if (config().direccion) {
              <a href="#ubicacion" class="rounded-md px-3 py-2.5 text-sm font-medium opacity-80 hover:bg-white/5 hover:opacity-100" (click)="menuAbierto.set(false)">Ubicación</a>
            }
          </nav>
        </div>
      }

      <!-- Hero -->
      <section
        class="relative flex h-56 items-center justify-center overflow-hidden bg-neutral text-neutral-content sm:h-72 md:h-80"
        [style.background-image]="config().heroImageUrl ? 'url(' + config().heroImageUrl + ')' : null"
        style="background-size: cover; background-position: center;"
      >
        <div class="absolute inset-0 bg-gradient-to-t from-neutral via-neutral/40 to-neutral/10"></div>

        @if (galeriaItems().length > 0) {
          <a
            href="#galeria"
            class="btn btn-sm absolute right-4 top-4 gap-2 border-none bg-base-100/90 text-base-content hover:bg-base-100 sm:right-6 sm:top-6"
          >
            <app-icon name="image" [size]="16" />
            Ver fotos
          </a>
        }
      </section>

      <!-- Cuerpo: contenido + sidebar de reserva fija, estilo tarjetas superpuestas al hero -->
      <div class="relative z-10 mx-auto -mt-10 max-w-6xl px-4 pb-16 sm:px-6 md:-mt-16">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <!-- Columna principal: todo el contenido scrolleable comparte contenedor con la sidebar,
               así la sidebar tiene "espacio" para quedar fija durante todo el scroll de la página. -->
          <div class="order-2 min-w-0 flex-1 space-y-6 lg:order-1">
            @if (config().descripcion; as descripcion) {
              <div id="acerca-de" class="card scroll-mt-24 border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body">
                  <h2 class="font-display text-lg font-semibold">Acerca de {{ config().nombre }}</h2>
                  <p class="whitespace-pre-line text-base-content/70">{{ descripcion }}</p>
                </div>
              </div>
            }

            <div id="servicios" class="card scroll-mt-24 border border-base-300 bg-base-100 shadow-sm">
              <div class="card-body">
                <h2 class="font-display text-lg font-semibold">Servicios</h2>
                @if (servicios().length > 0) {
                  <ul class="mt-2 divide-y divide-base-300">
                    @for (servicio of servicios(); track servicio.idServicio) {
                      <li class="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-base-200">
                        <div class="avatar placeholder shrink-0">
                          <div class="w-11 rounded-full bg-primary text-primary-content">
                            <app-icon name="scissors" [size]="18" />
                          </div>
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="truncate font-medium">{{ servicio.nombre }}</div>
                          @if (servicio.descripcion) {
                            <div class="truncate text-sm text-base-content/60">{{ servicio.descripcion }}</div>
                          }
                          <div class="text-sm text-base-content/60">{{ servicio.duracionMinutos }} min</div>
                        </div>
                        <div class="shrink-0 tabular-nums font-semibold text-primary">{{ servicio.precio | pesos }}</div>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="text-base-content/60">Todavía no hay servicios cargados.</p>
                }
              </div>
            </div>

            @if (galeriaItems().length > 0) {
              <div id="galeria" class="card scroll-mt-24 overflow-hidden border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body pb-4">
                  <h2 class="font-display text-lg font-semibold">Galería</h2>
                </div>

                <div
                  id="galeria-carousel"
                  class="carousel w-full"
                  (mouseenter)="pausarAutoplayGaleria()"
                  (mouseleave)="reanudarAutoplayGaleria($event)"
                  (wheel)="onWheelGaleria($event)"
                >
                  @for (item of galeriaItems(); track item.id; let i = $index) {
                    <div class="carousel-item relative w-full">
                      <img [src]="item.url" alt="" class="aspect-video w-full object-cover" loading="lazy" />
                      @if (galeriaItems().length > 1) {
                        <div class="absolute left-2 right-2 top-1/2 flex -translate-y-1/2 justify-between">
                          <button
                            type="button"
                            (click)="irAGaleria(i === 0 ? galeriaItems().length - 1 : i - 1)"
                            class="btn btn-circle btn-sm border-none bg-base-100/80"
                          >
                            ❮
                          </button>
                          <button
                            type="button"
                            (click)="irAGaleria((i + 1) % galeriaItems().length)"
                            class="btn btn-circle btn-sm border-none bg-base-100/80"
                          >
                            ❯
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>

                @if (galeriaItems().length > 1) {
                  <div class="card-body flex-row justify-center gap-2 pt-4">
                    @for (item of galeriaItems(); track item.id; let i = $index) {
                      <button type="button" (click)="irAGaleria(i)" class="btn btn-circle btn-ghost btn-xs">{{ i + 1 }}</button>
                    }
                  </div>
                }
              </div>
            }

            @if (config().direccion) {
              <div id="ubicacion" class="card scroll-mt-24 border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body">
                  <h2 class="font-display text-lg font-semibold">Ubicación</h2>
                  <p class="mt-1 flex items-center gap-2 text-base-content/70">
                    <app-icon name="map-pin" [size]="18" className="shrink-0" />
                    {{ config().direccion }}
                  </p>
                  @if (mapaUrl(); as url) {
                    <div class="mt-4 overflow-hidden rounded-lg border border-base-300">
                      <iframe [src]="url" width="100%" height="320" style="border:0" loading="lazy" title="Ubicación"></iframe>
                    </div>
                  }
                </div>
              </div>
            }

            @if (config().politicaReservas; as politica) {
              <div class="card border border-base-300 bg-base-100 shadow-sm">
                <div class="card-body">
                  <h2 class="font-display text-lg font-semibold">Política de reservas</h2>
                  <p class="whitespace-pre-line text-base-content/70">{{ politica }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Sidebar de reserva: fija en pantalla mientras el resto del contenido scrollea.
               Solo en desktop (lg): en mobile el card es alto y, si quedara sticky, tapa
               casi toda la pantalla e impide ver el resto de las secciones al hacer scroll. -->
          <aside id="horarios" class="order-1 scroll-mt-24 lg:sticky lg:top-20 lg:order-2 lg:w-[360px] lg:shrink-0">
            <div class="card border border-base-300 bg-base-100 shadow-sm">
              <div class="card-body items-center p-7 text-center">
                <div class="avatar placeholder">
                  <div class="w-24 rounded-full bg-base-200 text-3xl">
                    @if (logoParaAvatar(); as url) {
                      <img [src]="url" [alt]="config().nombre" />
                    } @else {
                      <span class="font-display">{{ inicial() }}</span>
                    }
                  </div>
                </div>
                <h1 class="font-display mt-4 text-2xl font-semibold">{{ config().nombre }}</h1>
                <a routerLink="/reservar" class="btn btn-primary btn-block mt-5 gap-2">
                  <app-icon name="calendar" [size]="20" />
                  Reservar
                </a>

                @if (proximaAperturaTexto(); as estado) {
                  <div class="collapse-arrow collapse mt-5 w-full border border-base-300 text-left">
                    <input type="checkbox" />
                    <div class="collapse-title min-h-0 flex items-center gap-2 py-3 text-sm font-medium">
                      <app-icon name="clock" [size]="16" className="shrink-0" />
                      {{ estado }}
                    </div>
                    <div class="collapse-content">
                      <div class="divide-y divide-base-300 text-sm">
                        @for (fila of filasHorario(); track fila.dia) {
                          <div class="flex items-center justify-between py-1.5">
                            <span [class.font-semibold]="fila.esHoy">{{ fila.nombre }}</span>
                            <span [class.font-semibold]="fila.esHoy" [class.opacity-50]="fila.cerrado">
                              {{ fila.cerrado ? 'Cerrado' : fila.horarioTexto }}
                            </span>
                          </div>
                        }
                      </div>
                      <p class="mt-2 text-xs text-base-content/50">Zona horaria: Argentina (UTC-3)</p>
                    </div>
                  </div>
                }

                @if (config().direccion; as direccion) {
                  <a href="#ubicacion" class="mt-3 flex w-full items-start gap-2 text-left text-sm hover:text-primary">
                    <app-icon name="map-pin" [size]="16" className="mt-0.5 shrink-0" />
                    <span>{{ direccion }}</span>
                  </a>
                }

                @if (tieneContacto()) {
                  <div class="collapse-arrow collapse mt-3 w-full border border-base-300 text-left">
                    <input type="checkbox" />
                    <div class="collapse-title min-h-0 py-3 text-sm font-medium">Ponete en contacto</div>
                    <div class="collapse-content space-y-2 text-sm">
                      @if (config().whatsappUrl; as url) {
                        <a [href]="url" target="_blank" rel="noopener" class="flex items-center gap-2 hover:text-primary">
                          <app-icon name="whatsapp" [size]="16" />
                          <span>WhatsApp</span>
                        </a>
                      }
                      @if (config().email; as email) {
                        <a [href]="'mailto:' + email" class="flex items-center gap-2 hover:text-primary">
                          <app-icon name="mail" [size]="16" />
                          <span>{{ email }}</span>
                        </a>
                      }
                      @if (config().googleReviewsUrl; as url) {
                        <a [href]="url" target="_blank" rel="noopener" class="flex items-center gap-2 hover:text-primary">
                          <app-icon name="star" [size]="16" />
                          <span>Dejanos tu reseña en Google</span>
                        </a>
                      }
                      @if (config().instagramUrl || config().facebookUrl) {
                        <div class="flex items-center gap-3 pt-1">
                          @if (config().instagramUrl; as url) {
                            <a [href]="url" target="_blank" rel="noopener" class="btn btn-ghost btn-square btn-sm" aria-label="Instagram">
                              <app-icon name="instagram" [size]="18" />
                            </a>
                          }
                          @if (config().facebookUrl; as url) {
                            <a [href]="url" target="_blank" rel="noopener" class="btn btn-ghost btn-square btn-sm" aria-label="Facebook">
                              <app-icon name="facebook" [size]="18" />
                            </a>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </aside>
        </div>
      </div>

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
          class="btn btn-circle btn-lg fixed bottom-6 right-6 z-40 border-none bg-[#25D366] text-white shadow-lg hover:bg-[#1ebe5a]"
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
  private readonly productosService = inject(ProductosService);
  private readonly cursosService = inject(CursosService);
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
    productosTitulo: null,
    productosDescripcion: null,
    cursosTitulo: null,
    cursosDescripcion: null,
    sobreNosotros: null,
  });
  servicios = signal<Servicio[]>([]);
  hayProductos = signal(false);
  hayCursos = signal(false);
  menuAbierto = signal(false);
  currentYear = new Date().getFullYear();

  tituloCorto = computed(() => `Bienvenido a ${this.config().nombre}`);

  logoParaAvatar = computed(() => this.config().iconoUrl || this.config().logoUrl);
  inicial = computed(() => this.config().nombre.trim().charAt(0).toUpperCase() || 'P');

  tieneContacto = computed(
    () =>
      !!(
        this.config().whatsappUrl ||
        this.config().email ||
        this.config().googleReviewsUrl ||
        this.config().instagramUrl ||
        this.config().facebookUrl
      ),
  );

  filasHorario = computed(() => {
    const horarios = this.config().horarios;
    const hoy = new Date().getDay();
    return DIAS_ORDEN.map(({ dia, nombre }) => {
      const existente = horarios?.find((h) => h.dia === dia);
      const rangos = existente ? rangosDe(existente) : [];
      return {
        dia,
        nombre,
        cerrado: existente?.cerrado ?? true,
        horarioTexto: rangos.map((r) => `${r.abre} - ${r.cierra}`).join(' y '),
        esHoy: dia === hoy,
      };
    });
  });

  estaAbierto = computed<{ abierto: boolean } | null>(() => {
    const horarios = this.config().horarios;
    if (!horarios || horarios.length === 0) return null;

    const ahora = new Date();
    const horaHoy = horarios.find((h) => h.dia === ahora.getDay());
    if (!horaHoy || horaHoy.cerrado) return { abierto: false };

    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const abierto = rangosDe(horaHoy).some((r) => minutosAhora >= minutosDe(r.abre) && minutosAhora < minutosDe(r.cierra));

    return { abierto };
  });

  /** Texto tipo "Abierto ahora" / "Cerrado · Abre martes a las 11:00" para el resumen de la sidebar. */
  proximaAperturaTexto = computed<string | null>(() => {
    const horarios = this.config().horarios;
    if (!horarios || horarios.length === 0) return null;

    if (this.estaAbierto()?.abierto) return 'Abierto ahora';

    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

    for (let i = 0; i < 7; i++) {
      const dia = (ahora.getDay() + i) % 7;
      const horario = horarios.find((h) => h.dia === dia);
      if (!horario || horario.cerrado) continue;

      const rangos = rangosDe(horario);
      if (rangos.length === 0) continue;

      if (i === 0) {
        const siguiente = rangos.find((r) => minutosDe(r.abre) > minutosAhora);
        if (!siguiente) continue; // ya pasaron todos los turnos de hoy
        return `Cerrado · Abre hoy a las ${siguiente.abre}`;
      }

      const nombreDia = DIAS_ORDEN.find((d) => d.dia === dia)?.nombre ?? '';
      return `Cerrado · Abre ${nombreDia} a las ${rangos[0].abre}`;
    }

    return 'Cerrado';
  });

  galeriaItems = computed(() => {
    const fotos = this.config().galeriaUrls ?? [];
    return fotos.map((url, i) => ({ url, id: `galeria-${i}` }));
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
    this.productosService.findAll(true, undefined, 1, 1).subscribe((res) => this.hayProductos.set(res.total > 0));
    this.cursosService.findAll(true, 1, 1).subscribe((res) => this.hayCursos.set(res.total > 0));
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

  /** Navegación manual (flechas y puntos): mueve solo el scroll horizontal del carrusel. */
  irAGaleria(index: number): void {
    this.indiceGaleriaActual = index;
    this.desplazarCarouselA(index);
  }

  /**
   * Sin esto, algunos navegadores (ej. Firefox) redirigen la rueda del mouse hacia el scroll
   * horizontal del carrusel cuando el cursor pasa por encima (no tiene overflow vertical propio),
   * lo que hace que el scroll snap-mandatory "trabe" el scroll normal de la página. Si el gesto
   * es mayormente vertical, lo dejamos pasar como scroll de página en vez de mover el carrusel.
   */
  onWheelGaleria(event: WheelEvent): void {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      window.scrollBy({ top: event.deltaY, left: 0 });
    }
  }

  private iniciarAutoplayGaleria(cantidad: number): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    this.autoplayIntervalId = setInterval(() => {
      this.indiceGaleriaActual = (this.indiceGaleriaActual + 1) % cantidad;
      this.desplazarCarouselA(this.indiceGaleriaActual);
    }, 4000);
  }

  /**
   * `scrollIntoView` mueve cualquier ancestro con overflow que haga falta para mostrar el
   * elemento, incluida la página entera si el carrusel no está totalmente visible verticalmente
   * — eso generaba saltos de scroll vertical no deseados cada vez que rotaba el autoplay.
   * Mover el `scrollLeft` del carrusel directamente evita tocar el scroll de la página.
   */
  private desplazarCarouselA(index: number): void {
    const carousel = document.getElementById('galeria-carousel');
    if (!carousel) return;
    carousel.scrollTo({ left: index * carousel.clientWidth, behavior: 'smooth' });
  }

  private detenerAutoplayGaleria(): void {
    if (this.autoplayIntervalId) {
      clearInterval(this.autoplayIntervalId);
      this.autoplayIntervalId = null;
    }
  }
}
