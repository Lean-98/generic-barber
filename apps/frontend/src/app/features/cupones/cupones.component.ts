import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CuponesService } from '../../shared/services/cupones.service';
import { Cupon, EstadoCupon } from '../../shared/models/cupon.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { fechaLocal } from '../../shared/utils/fecha-local.util';
import { mensajeDeErrorHttp } from '../../shared/utils/error-http.util';

type Vigencia = 'hoy' | 'mes' | 'fechas';

const ESTADOS: Record<EstadoCupon, { texto: string; clase: string }> = {
  ACTIVO: { texto: 'Activo', clase: 'badge-success' },
  PROGRAMADO: { texto: 'Programado', clase: 'badge-info' },
  PAUSADO: { texto: 'Pausado', clase: 'badge-warning' },
  AGOTADO: { texto: 'Agotado', clase: 'badge-ghost' },
  VENCIDO: { texto: 'Vencido', clase: 'badge-ghost' },
};

/** "2026-11-10" → "10/11". */
function diaMes(fecha: string): string {
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
}

@Component({
  selector: 'app-cupones',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="space-y-6 text-base-content">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Cupones</h1>
          <p class="text-base-content/60 mt-1">Códigos de descuento para compartir por WhatsApp y usar en la reserva online</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="label cursor-pointer gap-2 rounded-lg border bg-base-100 px-4 py-2 shadow-sm">
            <span class="label-text text-sm">Ver los de cumpleaños</span>
            <input type="checkbox" class="toggle toggle-sm toggle-primary" [checked]="verCumpleanos()" (change)="alternarVista()" />
          </label>
          <button class="btn btn-primary gap-2" (click)="abrirCrear()">
            <app-icon name="plus" [size]="18" />
            Nuevo cupón
          </button>
        </div>
      </div>

      @if (aviso()) {
        <div class="alert alert-success"><app-icon name="check-circle" [size]="18" /><span>{{ aviso() }}</span></div>
      }
      @if (errorLista()) {
        <div class="alert alert-error"><app-icon name="alert-circle" [size]="18" /><span>{{ errorLista() }}</span></div>
      }

      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Cupón</th>
                  <th>Descuento</th>
                  <th>Vigencia</th>
                  <th>Usos</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (c of cupones(); track c.idCupon) {
                  <tr class="hover:bg-base-200/50" [class.opacity-60]="c.estado === 'VENCIDO' || c.estado === 'PAUSADO'">
                    <td>
                      <div class="flex items-center gap-3">
                        <div class="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                          <app-icon name="tag" [size]="18" />
                        </div>
                        <div>
                          <div class="font-mono font-semibold tracking-wide">{{ c.codigo }}</div>
                          @if (c.persona) {
                            <div class="text-xs text-base-content/60">🎂 {{ c.persona.nombre }} {{ c.persona.apellido }} · {{ c.descripcion }}</div>
                          } @else if (c.descripcion) {
                            <div class="text-xs text-base-content/60">{{ c.descripcion }}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="tabular-nums font-medium">{{ c.descuentoPorcentaje }}%</td>
                    <td class="text-sm">{{ textoVigencia(c) }}</td>
                    <td class="tabular-nums text-sm">{{ c.usos }}{{ c.usosMaximos ? ' / ' + c.usosMaximos : '' }}</td>
                    <td><span class="badge badge-sm" [class]="estados[c.estado].clase">{{ estados[c.estado].texto }}</span></td>
                    <td class="text-right">
                      <div class="flex flex-wrap items-center justify-end gap-1">
                        @if (c.origen === 'PROMO') {
                          <button class="btn btn-ghost btn-sm text-success" (click)="compartir(c)" title="Enviar por WhatsApp" aria-label="Enviar por WhatsApp">
                            <app-icon name="whatsapp" [size]="16" />
                          </button>
                          <button class="btn btn-ghost btn-sm" (click)="copiar(c)" title="Copiar mensaje" aria-label="Copiar mensaje">
                            <app-icon name="copy" [size]="16" />
                          </button>
                        }
                        <button class="btn btn-ghost btn-sm" (click)="abrirEditar(c)" title="Editar" aria-label="Editar">
                          <app-icon name="edit" [size]="16" />
                        </button>
                        <button class="btn btn-ghost btn-sm" (click)="alternarActivo(c)" [title]="c.activo ? 'Pausar' : 'Reactivar'" [attr.aria-label]="c.activo ? 'Pausar' : 'Reactivar'">
                          <app-icon [name]="c.activo ? 'x' : 'check'" [size]="16" />
                        </button>
                        @if (c.usos === 0) {
                          <button class="btn btn-ghost btn-sm text-error hover:bg-error/10" (click)="confirmarEliminar(c)" title="Borrar" aria-label="Borrar">
                            <app-icon name="trash" [size]="16" />
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="py-12 text-center text-base-content/60">
                      <div class="flex flex-col items-center gap-3">
                        <app-icon name="tag" [size]="40" />
                        <div>
                          @if (verCumpleanos()) {
                            <p class="font-medium">Todavía no se generó ningún cupón de cumpleaños</p>
                            <p class="text-sm">Se crean solos cuando activás el beneficio en Configuración → Marca.</p>
                          } @else {
                            <p class="font-medium">Todavía no hay cupones</p>
                            <p class="text-sm">Creá uno, compartilo por WhatsApp y tus clientes lo usan al reservar.</p>
                          }
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="mt-2 text-xs text-base-content/60">
            Cada cliente lo puede usar una vez (se reconoce por el email). Si cancela el turno, el cupón le vuelve a quedar
            disponible. No se suma con otros descuentos: si el turno ya tiene uno mayor (club o personal), queda ese.
          </p>
        </div>
      </div>
    </div>

    <dialog #modal class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="mb-4 text-lg font-bold">{{ editando() ? 'Editar cupón' : 'Nuevo cupón' }}</h3>
        <form (ngSubmit)="guardar()" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="form-control">
              <label class="label"><span class="label-text">Código</span></label>
              <input
                type="text"
                class="input input-bordered w-full font-mono uppercase"
                [(ngModel)]="codigo"
                name="codigo"
                placeholder="HOY20"
                maxlength="30"
                required
              />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Descuento (%)</span></label>
              <input type="number" class="input input-bordered w-full" [(ngModel)]="porcentaje" name="porcentaje" min="1" max="100" placeholder="20" required />
            </div>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">Texto de la promo (opcional)</span></label>
            <input type="text" class="input input-bordered w-full" [(ngModel)]="descripcion" name="descripcion" maxlength="200" placeholder="Ej: 20% off en tu corte" />
            <label class="label"><span class="label-text-alt text-base-content/60">Va al principio del mensaje de WhatsApp.</span></label>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">Se puede usar para reservar</span></label>
            <div class="join w-full">
              <button type="button" class="btn join-item btn-sm flex-1" [class.btn-primary]="vigencia === 'hoy'" (click)="elegirVigencia('hoy')">Solo hoy</button>
              <button type="button" class="btn join-item btn-sm flex-1" [class.btn-primary]="vigencia === 'mes'" (click)="elegirVigencia('mes')">Este mes</button>
              <button type="button" class="btn join-item btn-sm flex-1" [class.btn-primary]="vigencia === 'fechas'" (click)="elegirVigencia('fechas')">Fechas a elección</button>
            </div>
            @if (vigencia === 'fechas') {
              <div class="mt-3 grid gap-4 sm:grid-cols-2">
                <div class="form-control">
                  <label class="label"><span class="label-text">Desde</span></label>
                  <input type="date" class="input input-bordered w-full" [(ngModel)]="desde" name="desde" required />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Hasta (incluido)</span></label>
                  <input type="date" class="input input-bordered w-full" [(ngModel)]="hasta" name="hasta" [min]="desde" required />
                </div>
              </div>
            }
            <label class="label">
              <span class="label-text-alt text-base-content/60">
                Cuenta el día en que el cliente reserva: el turno puede ser para otro día.
              </span>
            </label>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">Cupo (opcional)</span></label>
            <input type="number" class="input input-bordered w-full" [(ngModel)]="usosMaximos" name="usosMaximos" min="1" placeholder="Sin límite" />
            <label class="label"><span class="label-text-alt text-base-content/60">Ej: 10 = solo los primeros 10 que reserven.</span></label>
          </div>

          @if (errorForm()) {
            <div class="alert alert-error text-sm"><app-icon name="alert-circle" [size]="16" /><span>{{ errorForm() }}</span></div>
          }

          <div class="modal-action">
            <button type="button" class="btn btn-ghost" (click)="cerrar()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="guardando()">
              {{ guardando() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>cerrar</button></form>
    </dialog>

    <dialog #eliminarModal class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold text-error">Borrar cupón</h3>
        @if (cuponAEliminar(); as c) {
          <p class="py-4">
            ¿Querés borrar el cupón <strong class="font-mono">{{ c.codigo }}</strong> ({{ c.descuentoPorcentaje }}%)?
            Si ya lo compartiste, el código va a dejar de funcionar.
          </p>
        }
        <div class="modal-action">
          <button class="btn btn-ghost" (click)="cerrarEliminar()">Cancelar</button>
          <button class="btn btn-error" [disabled]="eliminando()" (click)="eliminar()">
            {{ eliminando() ? 'Borrando...' : 'Borrar' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="cerrarEliminar()">cerrar</button>
      </form>
    </dialog>
  `,
})
export class CuponesComponent implements OnInit {
  private readonly cuponesService = inject(CuponesService);
  @ViewChild('modal') modalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('eliminarModal') eliminarModalRef!: ElementRef<HTMLDialogElement>;
  cuponAEliminar = signal<Cupon | null>(null);
  eliminando = signal(false);

  readonly estados = ESTADOS;
  cupones = signal<Cupon[]>([]);
  /** Los de cumpleaños son personales y automáticos: van aparte de las promos. */
  verCumpleanos = signal(false);
  editando = signal<Cupon | null>(null);
  guardando = signal(false);
  errorForm = signal('');
  errorLista = signal('');
  aviso = signal('');

  codigo = '';
  porcentaje: number | null = null;
  descripcion = '';
  vigencia: Vigencia = 'hoy';
  desde = '';
  hasta = '';
  usosMaximos: number | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cuponesService.findAll(this.verCumpleanos() ? 'CUMPLEANOS' : 'PROMO').subscribe({
      next: (lista) => this.cupones.set(lista),
      error: (err) => this.errorLista.set(mensajeDeErrorHttp(err, 'No se pudieron cargar los cupones')),
    });
  }

  alternarVista(): void {
    this.verCumpleanos.update((v) => !v);
    this.cargar();
  }

  abrirCrear(): void {
    this.editando.set(null);
    this.codigo = '';
    this.porcentaje = null;
    this.descripcion = '';
    this.usosMaximos = null;
    this.elegirVigencia('hoy');
    this.errorForm.set('');
    this.modalRef.nativeElement.showModal();
  }

  abrirEditar(c: Cupon): void {
    this.editando.set(c);
    this.codigo = c.codigo;
    this.porcentaje = c.descuentoPorcentaje;
    this.descripcion = c.descripcion ?? '';
    this.usosMaximos = c.usosMaximos;
    this.vigencia = 'fechas';
    this.desde = c.desde;
    this.hasta = c.hasta;
    this.errorForm.set('');
    this.modalRef.nativeElement.showModal();
  }

  cerrar(): void {
    this.modalRef.nativeElement.close();
  }

  elegirVigencia(v: Vigencia): void {
    this.vigencia = v;
    const hoy = new Date();
    if (v === 'hoy') {
      this.desde = this.hasta = fechaLocal(hoy);
    } else if (v === 'mes') {
      this.desde = fechaLocal(hoy);
      this.hasta = fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
    } else if (!this.desde) {
      this.desde = this.hasta = fechaLocal(hoy);
    }
  }

  guardar(): void {
    this.errorForm.set('');
    if (!this.codigo.trim() || !this.porcentaje) {
      this.errorForm.set('Completá el código y el porcentaje.');
      return;
    }
    const data = {
      codigo: this.codigo.trim().toUpperCase(),
      descuentoPorcentaje: Number(this.porcentaje),
      descripcion: this.descripcion.trim(),
      desde: this.desde,
      hasta: this.hasta,
      usosMaximos: this.usosMaximos ? Number(this.usosMaximos) : null,
    };
    const editando = this.editando();
    this.guardando.set(true);
    (editando ? this.cuponesService.update(editando.idCupon, data) : this.cuponesService.create(data)).subscribe({
      next: (c) => {
        this.guardando.set(false);
        this.cerrar();
        this.cargar();
        this.mostrarAviso(editando ? `Cupón ${c.codigo} actualizado.` : `Cupón ${c.codigo} creado. Compartilo con el botón de WhatsApp.`);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(mensajeDeErrorHttp(err, 'No se pudo guardar el cupón'));
      },
    });
  }

  alternarActivo(c: Cupon): void {
    this.cuponesService.update(c.idCupon, { activo: !c.activo }).subscribe({
      next: () => {
        this.cargar();
        this.mostrarAviso(c.activo ? `Cupón ${c.codigo} pausado.` : `Cupón ${c.codigo} reactivado.`);
      },
      error: (err) => this.errorLista.set(mensajeDeErrorHttp(err, 'No se pudo actualizar el cupón')),
    });
  }

  confirmarEliminar(c: Cupon): void {
    this.cuponAEliminar.set(c);
    this.eliminarModalRef.nativeElement.showModal();
  }

  cerrarEliminar(): void {
    this.eliminarModalRef.nativeElement.close();
    this.cuponAEliminar.set(null);
  }

  eliminar(): void {
    const c = this.cuponAEliminar();
    if (!c) return;
    this.eliminando.set(true);
    this.cuponesService.remove(c.idCupon).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.cerrarEliminar();
        this.cargar();
        this.mostrarAviso(`Cupón ${c.codigo} borrado.`);
      },
      error: (err) => {
        this.eliminando.set(false);
        this.cerrarEliminar();
        this.errorLista.set(mensajeDeErrorHttp(err, 'No se pudo borrar el cupón'));
      },
    });
  }

  textoVigencia(c: Cupon): string {
    return c.desde === c.hasta ? `Solo el ${diaMes(c.desde)}` : `Del ${diaMes(c.desde)} al ${diaMes(c.hasta)}`;
  }

  /** El mensaje listo para pegar en WhatsApp, con el link que ya carga el código en /reservar. */
  mensajeWhatsapp(c: Cupon): string {
    const hoy = fechaLocal(new Date());
    const cuando =
      c.desde === c.hasta
        ? c.desde === hoy
          ? 'Solo por hoy'
          : `Solo el ${diaMes(c.desde)}`
        : c.desde <= hoy
          ? `Hasta el ${diaMes(c.hasta)}`
          : `Del ${diaMes(c.desde)} al ${diaMes(c.hasta)}`;
    const promo = c.descripcion || `${c.descuentoPorcentaje}% de descuento en tu turno`;
    const link = `${window.location.origin}/reservar?cupon=${encodeURIComponent(c.codigo)}`;
    return `${cuando}: ${promo} ✂️\nReservá con el código *${c.codigo}* acá: ${link}`;
  }

  compartir(c: Cupon): void {
    window.open(`https://wa.me/?text=${encodeURIComponent(this.mensajeWhatsapp(c))}`, '_blank', 'noopener');
  }

  copiar(c: Cupon): void {
    navigator.clipboard?.writeText(this.mensajeWhatsapp(c)).then(
      () => this.mostrarAviso('Mensaje copiado: pegalo en WhatsApp.'),
      () => this.errorLista.set('No se pudo copiar. Usá el botón de WhatsApp.'),
    );
  }

  private mostrarAviso(texto: string): void {
    this.errorLista.set('');
    this.aviso.set(texto);
    setTimeout(() => this.aviso.set(''), 4000);
  }
}
