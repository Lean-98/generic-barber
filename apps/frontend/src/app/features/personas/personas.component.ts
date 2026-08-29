import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PersonasService } from '../../shared/services/personas.service';
import { Persona, UpdatePersonaRequest } from '../../shared/models/persona.model';
import { Turno } from '../../shared/models/turno.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { FechaArPipe } from '../../shared/pipes/fecha-ar.pipe';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { PaginationComponent } from '../../shared/ui/pagination.component';

const LIMITE_PAGINA = 20;

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [FormsModule, IconComponent, FechaArPipe, PesosPipe, PaginationComponent],
  template: `
    <div class="space-y-6 text-base-content">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Clientes</h1>
          <p class="text-base-content/60 mt-1">Base de clientes de tu peluquería</p>
        </div>
        <button class="btn btn-primary gap-2" (click)="abrirCrear()">
          <app-icon name="plus" [size]="18" />
          Agregar
        </button>
      </div>

      <!-- Filtro -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="join w-full sm:w-auto">
              <input type="text" class="input input-bordered join-item w-full sm:w-80" [(ngModel)]="filtro" name="filtro" placeholder="Buscar por nombre, email, teléfono o Instagram..." (input)="aplicarFiltro()" />
              <button class="btn join-item" [disabled]="!filtro()" (click)="limpiarFiltro()">
                <app-icon name="x" [size]="18" />
              </button>
            </div>
            <span class="text-sm text-base-content/60">{{ total() }} {{ total() === 1 ? 'cliente' : 'clientes' }}</span>
          </div>
        </div>
      </div>

      <!-- Lista -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Instagram</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (persona of personas(); track persona.idPersona) {
                  <tr class="hover:bg-base-200/50">
                    <td>
                      <div class="flex items-center gap-3">
                        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-content">
                          {{ persona.nombre.charAt(0) }}{{ persona.apellido.charAt(0) }}
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-medium">{{ persona.nombre }} {{ persona.apellido }}</span>
                            @if (persona.aplicaDescuentoPersonal) {
                              <span class="badge badge-primary badge-outline badge-sm">Empleado</span>
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (persona.telefono) {
                        <span class="text-sm">{{ persona.telefono }}</span>
                      } @else {
                        <span class="text-sm text-base-content/50">—</span>
                      }
                      @if (persona.mail) {
                        <div class="text-sm text-base-content/60">{{ persona.mail }}</div>
                      }
                    </td>
                    <td>
                      @if (persona.instagram) {
                        <span class="text-sm font-medium">@{{ persona.instagram }}</span>
                      } @else {
                        <span class="text-sm text-base-content/50">—</span>
                      }
                    </td>
                    <td class="text-right">
                      <div class="flex flex-wrap items-center justify-end gap-1">
                        <button class="btn btn-ghost btn-sm" (click)="verDetalle(persona)" title="Ver detalle">
                          <app-icon name="user" [size]="16" />
                        </button>
                        <button class="btn btn-ghost btn-sm" (click)="verTurnos(persona)" title="Historial de turnos">
                          <app-icon name="calendar" [size]="16" />
                        </button>
                        <button class="btn btn-ghost btn-sm" (click)="editar(persona)" title="Editar">
                          <app-icon name="edit" [size]="16" />
                        </button>
                        <button class="btn btn-ghost btn-sm text-error hover:bg-error/10" (click)="confirmarEliminar(persona)" title="Eliminar">
                          <app-icon name="trash" [size]="16" />
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="text-center py-12 text-base-content/60">
                      <div class="flex flex-col items-center gap-3">
                        <app-icon name="users" [size]="40" />
                        <div>
                          <p class="font-medium">No hay clientes</p>
                          <p class="text-sm">Agregá el primero arriba</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="pagina()" [totalPages]="totalPaginas()" [total]="total()" (pageChange)="irAPagina($event)" />
        </div>
      </div>
    </div>

    <!-- Modal crear -->
    <dialog #crearModal class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="text-lg font-bold mb-4">Agregar cliente</h3>
        <form (ngSubmit)="crear()" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="form-control">
              <label class="label"><span class="label-text">Nombre</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoNombre" name="nombre" placeholder="Nombre" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Apellido</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoApellido" name="apellido" placeholder="Apellido" required />
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Email</span></label>
            <input type="email" class="input input-bordered w-full" [(ngModel)]="nuevoMail" name="mail" />
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="form-control">
              <label class="label"><span class="label-text">Teléfono</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoTelefono" name="telefono" placeholder="Teléfono" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Instagram</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoInstagram" name="instagram" placeholder="Instagram" />
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Fecha de nacimiento</span></label>
            <input type="date" class="input input-bordered w-full" [(ngModel)]="nuevaFechaNacimiento" name="fechaNacimiento" />
          </div>
          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="nuevoAplicaDescuentoPersonal" name="aplicaDescuentoPersonal" />
              <span class="label-text">Es empleado</span>
            </label>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" (click)="cerrarCrear()">Cancelar</button>
            <button type="submit" class="btn btn-primary gap-2" [class.btn-loading]="creando()" [disabled]="creando() || !nuevoNombre || !nuevoApellido">
              <app-icon name="plus" [size]="18" />
              Agregar
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="cerrarCrear()">close</button>
      </form>
    </dialog>

    <!-- Modal detalle -->
    <dialog #detalleModal class="modal">
      <div class="modal-box max-w-lg">
        @if (personaSeleccionada(); as p) {
          <div class="flex items-center gap-4 mb-6">
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary text-xl font-semibold text-primary-content">
              {{ p.nombre.charAt(0) }}{{ p.apellido.charAt(0) }}
            </div>
            <div>
              <h3 class="text-2xl font-medium">{{ p.nombre }} {{ p.apellido }}</h3>
              <p class="text-base-content/60">Cliente</p>
            </div>
          </div>
          <div class="grid gap-3 text-sm">
            <div class="flex justify-between py-2 border-b">
              <span class="text-base-content/60">Teléfono</span>
              <span>{{ p.telefono || '—' }}</span>
            </div>
            <div class="flex justify-between py-2 border-b">
              <span class="text-base-content/60">Email</span>
              <span>{{ p.mail || '—' }}</span>
            </div>
            <div class="flex justify-between py-2 border-b">
              <span class="text-base-content/60">Instagram</span>
              <span>{{ p.instagram ? '@' + p.instagram : '—' }}</span>
            </div>
            <div class="flex justify-between py-2 border-b">
              <span class="text-base-content/60">Fecha de nacimiento</span>
              <span>{{ p.fechaNacimiento ? (p.fechaNacimiento | fechaAr:'media':true) : '—' }}</span>
            </div>
            <div class="flex justify-between py-2 border-b">
              <span class="text-base-content/60">Total turnos</span>
              <span class="badge badge-primary">{{ turnosCliente().length }}</span>
            </div>
          </div>
          <div class="modal-action">
            <button class="btn btn-primary" (click)="cerrarDetalle()">Cerrar</button>
          </div>
        }
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="cerrarDetalle()">close</button>
      </form>
    </dialog>

    <!-- Modal editar -->
    <dialog #editarModal class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="text-lg font-bold mb-4">Editar cliente</h3>
        @if (personaEditando(); as p) {
          <form (ngSubmit)="guardarEdicion()" class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="form-control">
                <label class="label"><span class="label-text">Nombre</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="p.nombre" name="editNombre" required />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Apellido</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="p.apellido" name="editApellido" required />
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Email</span></label>
              <input type="email" class="input input-bordered w-full" [(ngModel)]="p.mail" name="editMail" />
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div class="form-control">
                <label class="label"><span class="label-text">Teléfono</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="p.telefono" name="editTelefono" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Instagram</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="p.instagram" name="editInstagram" />
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Fecha de nacimiento</span></label>
              <input type="date" class="input input-bordered w-full" [(ngModel)]="p.fechaNacimiento" name="editFechaNacimiento" />
            </div>
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input type="checkbox" class="toggle toggle-sm" [(ngModel)]="p.aplicaDescuentoPersonal" name="editAplicaDescuentoPersonal" />
                <span class="label-text">Es empleado</span>
              </label>
            </div>
            <div class="modal-action">
              <button type="button" class="btn btn-ghost" (click)="cerrarEditar()">Cancelar</button>
              <button type="submit" class="btn btn-primary" [class.btn-loading]="guardando()" [disabled]="guardando()">Guardar</button>
            </div>
          </form>
        }
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="cerrarEditar()">close</button>
      </form>
    </dialog>

    <!-- Modal historial de turnos -->
    <dialog #turnosModal class="modal">
      <div class="modal-box max-w-3xl">
        <h3 class="text-lg font-bold mb-4">
          @if (personaSeleccionada(); as p) {
            Historial de turnos - {{ p.nombre }} {{ p.apellido }}
          }
        </h3>
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Servicios</th>
                <th>Estado</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              @for (turno of turnosCliente(); track turno.idTurno) {
                <tr class="hover:bg-base-200/50">
                  <td>
                    <div class="font-medium">{{ turno.fechaHoraInicio | fechaAr:'corta' }}</div>
                    <div class="text-sm text-base-content/60">{{ turno.fechaHoraInicio | fechaAr:'hora' }}</div>
                  </td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      @for (detalle of turno.detalles; track detalle.idTurnoDetalle) {
                        <span class="badge badge-ghost badge-sm">{{ detalle.servicio?.nombre }} x{{ detalle.cantidad }}</span>
                      } @empty {
                        <span class="text-sm text-base-content/50">—</span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class]="getEstadoClasses(turno.estado)">{{ turno.estado }}</span>
                  </td>
                  <td class="tabular-nums text-right font-medium">
                    {{ totalTurno(turno) | pesos }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-8 text-base-content/60">
                    <div class="flex flex-col items-center gap-2">
                      <app-icon name="calendar" [size]="32" />
                      <span>No hay turnos registrados</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="modal-action">
          <button class="btn btn-primary" (click)="cerrarTurnos()">Cerrar</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="cerrarTurnos()">close</button>
      </form>
    </dialog>

    <!-- Modal confirmar eliminar -->
    <dialog #eliminarModal class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold text-error">Eliminar cliente</h3>
        @if (personaSeleccionada(); as p) {
          <p class="py-4">
            ¿Estás seguro de que querés eliminar a <strong>{{ p.nombre }} {{ p.apellido }}</strong>? Esta acción no se puede deshacer.
          </p>
        }
        <div class="modal-action">
          <button class="btn btn-ghost" (click)="cerrarEliminar()">Cancelar</button>
          <button class="btn btn-error" [class.btn-loading]="eliminando()" [disabled]="eliminando()" (click)="eliminar()">Eliminar</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="cerrarEliminar()">close</button>
      </form>
    </dialog>
  `,
})
export class PersonasComponent implements OnInit, OnDestroy {
  private readonly personasService = inject(PersonasService);
  private filtroTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('crearModal') crearModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('detalleModal') detalleModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('editarModal') editarModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('turnosModal') turnosModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('eliminarModal') eliminarModalRef!: ElementRef<HTMLDialogElement>;

  personas = signal<Persona[]>([]);
  filtro = signal('');
  pagina = signal(1);
  totalPaginas = signal(1);
  total = signal(0);

  personaSeleccionada = signal<Persona | null>(null);
  personaEditando = signal<Persona | null>(null);
  turnosCliente = signal<Turno[]>([]);
  guardando = signal(false);
  eliminando = signal(false);
  creando = signal(false);

  nuevoNombre = '';
  nuevoApellido = '';
  nuevoMail = '';
  nuevoTelefono = '';
  nuevoInstagram = '';
  nuevaFechaNacimiento = '';
  nuevoAplicaDescuentoPersonal = false;

  ngOnInit(): void {
    this.loadPersonas();
  }

  ngOnDestroy(): void {
    if (this.filtroTimeoutId) {
      clearTimeout(this.filtroTimeoutId);
    }
  }

  loadPersonas(): void {
    const query = this.filtro().trim();
    const request$ = query
      ? this.personasService.search(query, this.pagina(), LIMITE_PAGINA)
      : this.personasService.findAll(this.pagina(), LIMITE_PAGINA);

    request$.subscribe((res) => {
      this.personas.set(res.data);
      this.total.set(res.total);
      this.totalPaginas.set(res.totalPages);
    });
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.loadPersonas();
  }

  aplicarFiltro(): void {
    if (this.filtroTimeoutId) {
      clearTimeout(this.filtroTimeoutId);
    }
    this.filtroTimeoutId = setTimeout(() => {
      this.pagina.set(1);
      this.loadPersonas();
    }, 300);
  }

  limpiarFiltro(): void {
    this.filtro.set('');
    this.pagina.set(1);
    this.loadPersonas();
  }

  abrirCrear(): void {
    this.nuevoNombre = '';
    this.nuevoApellido = '';
    this.nuevoMail = '';
    this.nuevoTelefono = '';
    this.nuevoInstagram = '';
    this.nuevaFechaNacimiento = '';
    this.nuevoAplicaDescuentoPersonal = false;
    this.crearModalRef.nativeElement.showModal();
  }

  cerrarCrear(): void {
    this.crearModalRef.nativeElement.close();
  }

  crear(): void {
    if (!this.nuevoNombre || !this.nuevoApellido) return;

    this.creando.set(true);
    this.personasService.create({
      nombre: this.nuevoNombre,
      apellido: this.nuevoApellido,
      mail: this.nuevoMail || undefined,
      telefono: this.nuevoTelefono || undefined,
      instagram: this.nuevoInstagram || undefined,
      fechaNacimiento: this.nuevaFechaNacimiento || undefined,
      aplicaDescuentoPersonal: this.nuevoAplicaDescuentoPersonal,
    }).subscribe({
      next: () => {
        this.creando.set(false);
        this.cerrarCrear();
        this.loadPersonas();
      },
      error: () => {
        this.creando.set(false);
      },
    });
  }

  verDetalle(persona: Persona): void {
    this.personaSeleccionada.set(persona);
    this.detalleModalRef.nativeElement.showModal();
  }

  cerrarDetalle(): void {
    this.detalleModalRef.nativeElement.close();
    this.personaSeleccionada.set(null);
  }

  verTurnos(persona: Persona): void {
    this.personaSeleccionada.set(persona);
    this.turnosCliente.set([]);
    this.turnosModalRef.nativeElement.showModal();
    this.personasService.findTurnos(persona.idPersona).subscribe((t) => this.turnosCliente.set(t));
  }

  cerrarTurnos(): void {
    this.turnosModalRef.nativeElement.close();
    this.personaSeleccionada.set(null);
    this.turnosCliente.set([]);
  }

  editar(persona: Persona): void {
    this.personaEditando.set({
      ...persona,
      // El backend devuelve fechaNacimiento como ISO datetime completo
      // ("1990-05-15T00:00:00.000Z"); <input type="date"> solo acepta
      // "yyyy-MM-dd" y si no matchea exacto lo muestra vacío.
      fechaNacimiento: persona.fechaNacimiento?.slice(0, 10),
    });
    this.editarModalRef.nativeElement.showModal();
  }

  cerrarEditar(): void {
    this.editarModalRef.nativeElement.close();
    this.personaEditando.set(null);
  }

  guardarEdicion(): void {
    const p = this.personaEditando();
    if (!p || !p.nombre || !p.apellido) return;

    this.guardando.set(true);
    const data: UpdatePersonaRequest = {
      nombre: p.nombre,
      apellido: p.apellido,
      mail: p.mail || undefined,
      telefono: p.telefono || undefined,
      instagram: p.instagram || undefined,
      fechaNacimiento: p.fechaNacimiento || undefined,
      aplicaDescuentoPersonal: p.aplicaDescuentoPersonal,
    };

    this.personasService.update(p.idPersona, data).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarEditar();
        this.loadPersonas();
      },
      error: () => {
        this.guardando.set(false);
      },
    });
  }

  confirmarEliminar(persona: Persona): void {
    this.personaSeleccionada.set(persona);
    this.eliminarModalRef.nativeElement.showModal();
  }

  cerrarEliminar(): void {
    this.eliminarModalRef.nativeElement.close();
    this.personaSeleccionada.set(null);
  }

  eliminar(): void {
    const p = this.personaSeleccionada();
    if (!p) return;

    this.eliminando.set(true);
    this.personasService.remove(p.idPersona).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.cerrarEliminar();
        this.loadPersonas();
      },
      error: () => {
        this.eliminando.set(false);
      },
    });
  }

  totalTurno(turno: Turno): number {
    return (turno.detalles || []).reduce((total, d) => total + Number(d.precioReal) * d.cantidad, 0);
  }

  getEstadoClasses(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'badge-warning',
      CONFIRMADO: 'badge-info',
      EN_PROCESO: 'badge-primary',
      COMPLETADO: 'badge-success',
      CANCELADO: 'badge-error',
      NO_SHOW: 'badge-error',
    };
    return map[estado] || 'badge-ghost';
  }
}
