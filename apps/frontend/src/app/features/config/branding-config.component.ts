import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { BrandingService } from '../../core/services/branding.service';
import { BloqueAuthenticClub, BloqueSobreNosotros, ClaveBloqueAuthenticClub, ClaveBloqueSobreNosotros, HorarioDia } from '../../shared/models/configuracion.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { ImageUploadComponent } from '../../shared/ui/image-upload.component';

const COLOR_PRIMARIO_DEFECTO = '#A9762F';
const COLOR_SECUNDARIO_DEFECTO = '#7A2E2E';

interface FilaHorario {
  dia: number;
  nombre: string;
  cerrado: boolean;
  abre: string;
  cierra: string;
  tieneSegundoTurno: boolean;
  abre2: string;
  cierra2: string;
}

interface FilaSobreNosotros {
  clave: ClaveBloqueSobreNosotros;
  titulo: string;
  descripcion: string;
}

const BLOQUES_SOBRE_NOSOTROS_DEFECTO: { clave: ClaveBloqueSobreNosotros; titulo: string }[] = [
  { clave: 'quienesSomos', titulo: 'Quiénes somos' },
  { clave: 'nuestraHistoria', titulo: 'Nuestra historia' },
  { clave: 'mision', titulo: 'Misión' },
  { clave: 'valores', titulo: 'Valores' },
];

interface FilaAuthenticClub {
  clave: ClaveBloqueAuthenticClub;
  titulo: string;
  descripcion: string;
}

const BLOQUES_AUTHENTIC_CLUB_DEFECTO: { clave: ClaveBloqueAuthenticClub; titulo: string }[] = [
  { clave: 'presentarTarjeta', titulo: 'Beneficio por presentar la tarjeta' },
  { clave: 'empresa', titulo: 'Beneficio para la empresa' },
  { clave: 'cumpleanos', titulo: 'Beneficio de cumpleaños' },
  { clave: 'recomendar', titulo: 'Beneficio por recomendar a alguien' },
];

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
  selector: 'app-branding-config',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, BrandMarkComponent, ImageUploadComponent],
  template: `
    <div class="space-y-6 text-base-content">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Marca</h1>
          <p class="text-base-content/60 mt-1">Identidad visual y contenido de la landing pública de tu negocio</p>
        </div>
        <a routerLink="/" target="_blank" class="btn btn-ghost gap-2">
          <app-icon name="globe" [size]="18" />
          Ver landing
        </a>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center gap-2 py-12">
          <app-icon name="loader" [size]="20" className="animate-spin" />
          <span class="text-base-content/70">Cargando...</span>
        </div>
      } @else {
        <form (ngSubmit)="guardar()" class="space-y-6">
          <div class="grid gap-6 lg:grid-cols-3">
            <div class="card bg-base-100 shadow-sm lg:col-span-2">
              <div class="card-body space-y-4">
                <h2 class="card-title text-lg">Identidad</h2>
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

          <div class="divider">
            <span class="badge badge-primary gap-1">
              <app-icon name="globe" [size]="14" />
              Landing page
            </span>
          </div>
          <p class="-mt-4 text-sm text-base-content/60">Lo que ven tus clientes en la página pública del negocio (botón "Ver landing" arriba).</p>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Portada y descripción</h2>
              <div class="form-control">
                <label class="label"><span class="label-text">URL de imagen de portada</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="heroImageUrl" name="heroImageUrl" placeholder="https://res.cloudinary.com/.../portada.jpg" />
                <label class="label"><span class="label-text-alt text-base-content/50">Dejar vacío para usar un fondo con tus colores de marca.</span></label>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Descripción / Acerca de</span></label>
                <textarea class="textarea textarea-bordered w-full" rows="4" [(ngModel)]="descripcion" name="descripcion" placeholder="Contanos sobre tu negocio..." maxlength="2000"></textarea>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Contacto y ubicación</h2>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="form-control">
                  <label class="label"><span class="label-text">Teléfono</span></label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="telefono" name="telefono" placeholder="+54 11 1234-5678" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Email</span></label>
                  <input type="email" class="input input-bordered w-full" [(ngModel)]="email" name="email" placeholder="contacto@tunegocio.com" />
                </div>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Dirección</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="direccion" name="direccion" placeholder="Av. Siempre Viva 123, Santa Rosa, La Pampa" />
                <label class="label"><span class="label-text-alt text-base-content/50">Se usa para mostrar el mapa en la landing.</span></label>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Redes y reseñas</h2>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="form-control">
                  <label class="label"><span class="label-text">URL de Instagram</span></label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="instagramUrl" name="instagramUrl" placeholder="https://instagram.com/tunegocio" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">URL de Facebook</span></label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="facebookUrl" name="facebookUrl" placeholder="https://facebook.com/tunegocio" />
                </div>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">URL para dejar reseña en Google</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="googleReviewsUrl" name="googleReviewsUrl" placeholder="https://g.page/r/.../review" />
                <label class="label"><span class="label-text-alt text-base-content/50">La sacás de tu ficha de Google Business.</span></label>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Link de WhatsApp</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="whatsappUrl" name="whatsappUrl" placeholder="https://wa.me/5491112345678" />
                <label class="label"><span class="label-text-alt text-base-content/50">Formato wa.me con tu número completo (código de país + área, sin espacios ni guiones).</span></label>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Galería de fotos</h2>
              <p class="text-sm text-base-content/60">Cortes, local, equipo — lo que quieras mostrar en la landing.</p>
              <div class="space-y-2">
                @for (foto of galeria; track $index; let i = $index) {
                  <div class="flex items-center gap-2">
                    <input type="text" class="input input-bordered w-full" [(ngModel)]="galeria[i]" [name]="'foto' + i" placeholder="https://res.cloudinary.com/.../foto.jpg" />
                    @if (foto) {
                      <img [src]="foto" alt="" class="h-10 w-10 shrink-0 rounded object-cover" />
                    }
                    <button type="button" class="btn btn-ghost btn-square btn-sm text-error hover:bg-error/10" (click)="quitarFoto(i)" aria-label="Quitar foto">
                      <app-icon name="trash" [size]="16" />
                    </button>
                  </div>
                }
              </div>
              @if (galeria.length < 12) {
                <button type="button" class="btn btn-ghost btn-sm gap-2" (click)="agregarFoto()">
                  <app-icon name="plus" [size]="16" />
                  Agregar foto
                </button>
              }
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Catálogo: Productos y Cursos</h2>
              <p class="text-sm text-base-content/60">Título y bajada de las páginas públicas de <a routerLink="/tienda" target="_blank" class="link">Tienda</a> y <a routerLink="/cursos-info" target="_blank" class="link">Cursos</a>.</p>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="form-control">
                  <label class="label"><span class="label-text">Título de la sección de productos</span></label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="productosTitulo" name="productosTitulo" placeholder="Nuestros productos" maxlength="80" />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Título de la sección de cursos</span></label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="cursosTitulo" name="cursosTitulo" placeholder="Nuestros cursos" maxlength="80" />
                </div>
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="form-control">
                  <label class="label"><span class="label-text">Descripción de la sección de productos</span></label>
                  <textarea class="textarea textarea-bordered w-full" rows="3" [(ngModel)]="productosDescripcion" name="productosDescripcion" placeholder="Cera, pomadas, aceites para barba..." maxlength="2000"></textarea>
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Descripción de la sección de cursos</span></label>
                  <textarea class="textarea textarea-bordered w-full" rows="3" [(ngModel)]="cursosDescripcion" name="cursosDescripcion" placeholder="Formación profesional en barbería..." maxlength="2000"></textarea>
                </div>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Sobre nosotros</h2>
              <p class="text-sm text-base-content/60">Sección aparte en la landing con estos 4 bloques. Dejá la descripción vacía para ocultar un bloque.</p>
              <div class="form-control">
                <label class="label"><span class="label-text">Bajada / subtítulo</span></label>
                <input
                  type="text"
                  class="input input-bordered w-full"
                  [(ngModel)]="sobreNosotrosBajada"
                  name="sobreNosotrosBajada"
                  placeholder="Conocé la historia, la misión y los valores detrás de cada corte."
                  maxlength="200"
                />
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                @for (bloque of bloquesSobreNosotros; track bloque.clave) {
                  <div class="form-control gap-2 rounded-lg border border-base-300 p-3">
                    <input
                      type="text"
                      class="input input-bordered input-sm w-full font-medium"
                      [(ngModel)]="bloque.titulo"
                      [name]="'sobreNosotrosTitulo' + bloque.clave"
                      maxlength="80"
                    />
                    <textarea
                      class="textarea textarea-bordered w-full"
                      rows="3"
                      [(ngModel)]="bloque.descripcion"
                      [name]="'sobreNosotrosDescripcion' + bloque.clave"
                      placeholder="Descripción breve..."
                      maxlength="1000"
                    ></textarea>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Authentic Club</h2>
              <p class="text-sm text-base-content/60">
                Página aparte de la landing con la tarjeta de beneficios. Dejá la descripción vacía para ocultar un beneficio.
              </p>
              <div class="form-control">
                <label class="label"><span class="label-text">Nombre del club</span></label>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    class="input input-bordered w-full"
                    [(ngModel)]="authenticClubNombre"
                    name="authenticClubNombre"
                    placeholder="Ej: Premium (vacío = solo &quot;Club&quot;)"
                    maxlength="40"
                  />
                  <span class="text-base-content/60">Club</span>
                </div>
                <label class="label"><span class="label-text-alt text-base-content/50">"Club" es fijo, esto va antes (vacío = solo "Club").</span></label>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Bajada / subtítulo</span></label>
                <input
                  type="text"
                  class="input input-bordered w-full"
                  [(ngModel)]="authenticClubBajada"
                  name="authenticClubBajada"
                  placeholder="Más cortes, más beneficios cada vez que nos visitás."
                  maxlength="200"
                />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Imagen de la tarjeta</span></label>
                <app-image-upload [folder]="'authentic-club'" [(url)]="authenticClubImagenUrl" />
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                @for (beneficio of bloquesAuthenticClub; track beneficio.clave) {
                  <div class="form-control gap-2 rounded-lg border border-base-300 p-3">
                    <input
                      type="text"
                      class="input input-bordered input-sm w-full font-medium"
                      [(ngModel)]="beneficio.titulo"
                      [name]="'authenticClubTitulo' + beneficio.clave"
                      maxlength="80"
                    />
                    <textarea
                      class="textarea textarea-bordered w-full"
                      rows="3"
                      [(ngModel)]="beneficio.descripcion"
                      [name]="'authenticClubDescripcion' + beneficio.clave"
                      placeholder="Descripción breve..."
                      maxlength="1000"
                    ></textarea>
                  </div>
                }
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Nota al pie</span></label>
                <input
                  type="text"
                  class="input input-bordered w-full"
                  [(ngModel)]="authenticClubNota"
                  name="authenticClubNota"
                  placeholder="Ej: Pedí tu tarjeta en el local. Es gratuita y con cada corte sumás un sello."
                  maxlength="300"
                />
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Horarios de atención</h2>
              <div class="space-y-2">
                @for (fila of filas; track fila.dia) {
                  <div class="flex flex-wrap items-center gap-3 rounded-lg border border-base-300 p-3">
                    <span class="w-24 shrink-0 font-medium">{{ fila.nombre }}</span>
                    <label class="label cursor-pointer gap-2">
                      <span class="label-text text-sm">Cerrado</span>
                      <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="fila.cerrado" [name]="'cerrado' + fila.dia" />
                    </label>
                    @if (!fila.cerrado) {
                      <div class="flex flex-wrap items-center gap-2">
                        <input type="time" class="input input-bordered input-sm" [(ngModel)]="fila.abre" [name]="'abre' + fila.dia" />
                        <span class="text-base-content/50">a</span>
                        <input type="time" class="input input-bordered input-sm" [(ngModel)]="fila.cierra" [name]="'cierra' + fila.dia" />

                        @if (fila.tieneSegundoTurno) {
                          <span class="text-base-content/50">y</span>
                          <input type="time" class="input input-bordered input-sm" [(ngModel)]="fila.abre2" [name]="'abre2' + fila.dia" />
                          <span class="text-base-content/50">a</span>
                          <input type="time" class="input input-bordered input-sm" [(ngModel)]="fila.cierra2" [name]="'cierra2' + fila.dia" />
                          <button type="button" class="btn btn-ghost btn-square btn-xs" (click)="quitarSegundoTurno(fila)" aria-label="Quitar segundo horario">
                            <app-icon name="x" [size]="14" />
                          </button>
                        } @else {
                          <button type="button" class="btn btn-ghost btn-xs gap-1" (click)="agregarSegundoTurno(fila)">
                            <app-icon name="plus" [size]="14" />
                            Horario partido
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Política de reservas</h2>
              <div class="form-control">
                <textarea class="textarea textarea-bordered w-full" rows="4" [(ngModel)]="politicaReservas" name="politicaReservas" placeholder="Ej: pedimos avisar con al menos 4 horas de anticipación ante una cancelación..." maxlength="2000"></textarea>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow-sm">
            <div class="card-body space-y-4">
              <h2 class="card-title text-lg">Navegación</h2>
              <p class="text-sm text-base-content/60">Elegí qué páginas mostrar en el menú de la landing.</p>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="mostrarServicios" name="mostrarServicios" />
                  <span class="label-text">Servicios</span>
                </label>
                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="mostrarNosotros" name="mostrarNosotros" />
                  <span class="label-text">Sobre nosotros</span>
                </label>
                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="mostrarAuthenticClub" name="mostrarAuthenticClub" />
                  <span class="label-text">Authentic Club</span>
                </label>
                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="mostrarTienda" name="mostrarTienda" />
                  <span class="label-text">Tienda / Productos</span>
                </label>
                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="mostrarCursos" name="mostrarCursos" />
                  <span class="label-text">Cursos</span>
                </label>
                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="mostrarGaleria" name="mostrarGaleria" />
                  <span class="label-text">Galería</span>
                </label>
                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="mostrarUbicacion" name="mostrarUbicacion" />
                  <span class="label-text">Ubicación</span>
                </label>
              </div>
              <p class="text-xs text-base-content/50">
                Tienda, Cursos, Galería y Ubicación igual se ocultan solos si no hay contenido cargado, aunque estén activados acá.
              </p>
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
  `,
})
export class BrandingConfigComponent implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly brandingService = inject(BrandingService);
  private mensajeTimeoutId: ReturnType<typeof setTimeout> | null = null;

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

  descripcion = '';
  heroImageUrl = '';
  telefono = '';
  email = '';
  direccion = '';
  instagramUrl = '';
  facebookUrl = '';
  googleReviewsUrl = '';
  whatsappUrl = '';
  politicaReservas = '';
  filas: FilaHorario[] = DIAS_ORDEN.map(({ dia, nombre }) => ({
    dia,
    nombre,
    cerrado: true,
    abre: '09:00',
    cierra: '18:00',
    tieneSegundoTurno: false,
    abre2: '16:30',
    cierra2: '20:00',
  }));
  galeria: string[] = [];
  productosTitulo = '';
  productosDescripcion = '';
  cursosTitulo = '';
  cursosDescripcion = '';
  bloquesSobreNosotros: FilaSobreNosotros[] = BLOQUES_SOBRE_NOSOTROS_DEFECTO.map(({ clave, titulo }) => ({ clave, titulo, descripcion: '' }));
  sobreNosotrosBajada = '';
  authenticClubNombre = '';
  authenticClubBajada = '';
  authenticClubNota = '';
  mostrarNosotros = true;
  mostrarAuthenticClub = true;
  mostrarTienda = true;
  mostrarCursos = true;
  mostrarServicios = true;
  mostrarGaleria = true;
  mostrarUbicacion = true;
  authenticClubImagenUrl = '';
  bloquesAuthenticClub: FilaAuthenticClub[] = BLOQUES_AUTHENTIC_CLUB_DEFECTO.map(({ clave, titulo }) => ({ clave, titulo, descripcion: '' }));

  ngOnInit(): void {
    this.configuracionService.getBranding().subscribe({
      next: (data) => {
        this.nombre = data.nombre;
        this.logoUrl = data.logoUrl ?? '';
        this.iconoUrl = data.iconoUrl ?? '';
        this.colorPrimario.set(data.colorPrimario ?? '');
        this.colorSecundario.set(data.colorSecundario ?? '');
        this.descripcion = data.descripcion ?? '';
        this.heroImageUrl = data.heroImageUrl ?? '';
        this.telefono = data.telefono ?? '';
        this.email = data.email ?? '';
        this.direccion = data.direccion ?? '';
        this.instagramUrl = data.instagramUrl ?? '';
        this.facebookUrl = data.facebookUrl ?? '';
        this.googleReviewsUrl = data.googleReviewsUrl ?? '';
        this.whatsappUrl = data.whatsappUrl ?? '';
        this.politicaReservas = data.politicaReservas ?? '';
        this.filas = this.mapearHorarios(data.horarios);
        this.galeria = data.galeriaUrls ? [...data.galeriaUrls] : [];
        this.productosTitulo = data.productosTitulo ?? '';
        this.productosDescripcion = data.productosDescripcion ?? '';
        this.cursosTitulo = data.cursosTitulo ?? '';
        this.cursosDescripcion = data.cursosDescripcion ?? '';
        this.bloquesSobreNosotros = this.mapearSobreNosotros(data.sobreNosotros);
        this.sobreNosotrosBajada = data.sobreNosotrosBajada ?? '';
        this.authenticClubNombre = data.authenticClubNombre ?? '';
        this.authenticClubBajada = data.authenticClubBajada ?? '';
        this.authenticClubNota = data.authenticClubNota ?? '';
        this.mostrarNosotros = data.mostrarNosotros;
        this.mostrarAuthenticClub = data.mostrarAuthenticClub;
        this.mostrarTienda = data.mostrarTienda;
        this.mostrarCursos = data.mostrarCursos;
        this.mostrarServicios = data.mostrarServicios;
        this.mostrarGaleria = data.mostrarGaleria;
        this.mostrarUbicacion = data.mostrarUbicacion;
        this.authenticClubImagenUrl = data.authenticClubImagenUrl ?? '';
        this.bloquesAuthenticClub = this.mapearAuthenticClub(data.authenticClubBeneficios);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private mapearHorarios(horarios: HorarioDia[] | null): FilaHorario[] {
    return DIAS_ORDEN.map(({ dia, nombre }) => {
      const existente = horarios?.find((h) => h.dia === dia);
      return {
        dia,
        nombre,
        cerrado: existente?.cerrado ?? true,
        abre: existente?.abre ?? '09:00',
        cierra: existente?.cierra ?? '18:00',
        tieneSegundoTurno: !!(existente?.abre2 && existente?.cierra2),
        abre2: existente?.abre2 ?? '16:30',
        cierra2: existente?.cierra2 ?? '20:00',
      };
    });
  }

  private mapearSobreNosotros(bloques: BloqueSobreNosotros[] | null): FilaSobreNosotros[] {
    return BLOQUES_SOBRE_NOSOTROS_DEFECTO.map(({ clave, titulo }) => {
      const existente = bloques?.find((b) => b.clave === clave);
      return {
        clave,
        titulo: existente?.titulo || titulo,
        descripcion: existente?.descripcion ?? '',
      };
    });
  }

  private mapearAuthenticClub(beneficios: BloqueAuthenticClub[] | null): FilaAuthenticClub[] {
    return BLOQUES_AUTHENTIC_CLUB_DEFECTO.map(({ clave, titulo }) => {
      const existente = beneficios?.find((b) => b.clave === clave);
      return {
        clave,
        titulo: existente?.titulo || titulo,
        descripcion: existente?.descripcion ?? '',
      };
    });
  }

  agregarSegundoTurno(fila: FilaHorario): void {
    fila.tieneSegundoTurno = true;
  }

  quitarSegundoTurno(fila: FilaHorario): void {
    fila.tieneSegundoTurno = false;
  }

  agregarFoto(): void {
    this.galeria = [...this.galeria, ''];
  }

  quitarFoto(index: number): void {
    this.galeria = this.galeria.filter((_, i) => i !== index);
  }

  guardar(): void {
    this.guardando.set(true);
    this.mensaje.set('');

    const horarios: HorarioDia[] = this.filas.map((f) => ({
      dia: f.dia,
      cerrado: f.cerrado,
      abre: f.cerrado ? undefined : f.abre,
      cierra: f.cerrado ? undefined : f.cierra,
      abre2: f.cerrado || !f.tieneSegundoTurno ? undefined : f.abre2,
      cierra2: f.cerrado || !f.tieneSegundoTurno ? undefined : f.cierra2,
    }));
    const galeriaUrls = this.galeria.map((url) => url.trim()).filter((url) => url.length > 0);
    const sobreNosotros: BloqueSobreNosotros[] = this.bloquesSobreNosotros.map((b) => ({
      clave: b.clave,
      titulo: b.titulo.trim() || BLOQUES_SOBRE_NOSOTROS_DEFECTO.find((d) => d.clave === b.clave)!.titulo,
      descripcion: b.descripcion,
    }));
    const authenticClubBeneficios: BloqueAuthenticClub[] = this.bloquesAuthenticClub.map((b) => ({
      clave: b.clave,
      titulo: b.titulo.trim() || BLOQUES_AUTHENTIC_CLUB_DEFECTO.find((d) => d.clave === b.clave)!.titulo,
      descripcion: b.descripcion,
    }));

    this.configuracionService
      .updateBranding({
        nombre: this.nombre,
        logoUrl: this.logoUrl,
        iconoUrl: this.iconoUrl,
        colorPrimario: this.colorPrimario(),
        colorSecundario: this.colorSecundario(),
        descripcion: this.descripcion,
        heroImageUrl: this.heroImageUrl,
        telefono: this.telefono,
        email: this.email,
        direccion: this.direccion,
        instagramUrl: this.instagramUrl,
        facebookUrl: this.facebookUrl,
        googleReviewsUrl: this.googleReviewsUrl,
        whatsappUrl: this.whatsappUrl,
        politicaReservas: this.politicaReservas,
        horarios,
        galeriaUrls,
        productosTitulo: this.productosTitulo,
        productosDescripcion: this.productosDescripcion,
        cursosTitulo: this.cursosTitulo,
        cursosDescripcion: this.cursosDescripcion,
        sobreNosotros,
        sobreNosotrosBajada: this.sobreNosotrosBajada,
        authenticClubNombre: this.authenticClubNombre,
        authenticClubBajada: this.authenticClubBajada,
        authenticClubImagenUrl: this.authenticClubImagenUrl,
        authenticClubBeneficios,
        authenticClubNota: this.authenticClubNota,
        mostrarNosotros: this.mostrarNosotros,
        mostrarAuthenticClub: this.mostrarAuthenticClub,
        mostrarTienda: this.mostrarTienda,
        mostrarCursos: this.mostrarCursos,
        mostrarServicios: this.mostrarServicios,
        mostrarGaleria: this.mostrarGaleria,
        mostrarUbicacion: this.mostrarUbicacion,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarMensaje('Cambios guardados correctamente', true);
          this.brandingService.refresh();
        },
        error: (err) => {
          this.guardando.set(false);
          this.mostrarMensaje(err?.error?.message?.[0] || err?.error?.message || 'Error al guardar los cambios', false);
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

  private mostrarMensaje(texto: string, ok: boolean): void {
    if (this.mensajeTimeoutId) {
      clearTimeout(this.mensajeTimeoutId);
    }
    this.exito.set(ok);
    this.mensaje.set(texto);
    this.mensajeTimeoutId = setTimeout(() => {
      this.mensaje.set('');
      this.mensajeTimeoutId = null;
    }, 5000);
  }
}
