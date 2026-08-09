import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiciosService } from '../../shared/services/servicios.service';
import { Servicio, ServicioHistorial, CreateServicioRequest, UpdateServicioRequest } from '../../shared/models/servicio.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { FechaArPipe } from '../../shared/pipes/fecha-ar.pipe';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [FormsModule, IconComponent, FechaArPipe, PesosPipe],
  template: `
    <div class="space-y-6 text-base-content">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Servicios</h1>
          <p class="text-base-content/60 mt-1">Servicios que ofrecés en tu peluquería</p>
        </div>
        <div class="flex items-center gap-2">
          <label class="label cursor-pointer gap-2 bg-base-100 px-4 py-2 rounded-lg border shadow-sm">
            <span class="label-text text-sm">Mostrar no vigentes</span>
            <input type="checkbox" class="toggle toggle-sm toggle-primary" [(ngModel)]="mostrarNoVigentes" (change)="toggleVigentes()" />
          </label>
        </div>
      </div>

      <!-- Agregar servicio -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <h2 class="card-title text-lg mb-4">Agregar servicio</h2>
          <form (ngSubmit)="crear()" class="grid gap-4 md:grid-cols-6">
            <div class="md:col-span-2">
              <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoNombre" name="nombre" placeholder="Nombre del servicio" required />
            </div>
            <div>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevaCategoria" name="categoria" placeholder="Categoría" />
            </div>
            <div>
              <input type="number" class="input input-bordered w-full" [(ngModel)]="nuevoPrecio" name="precio" placeholder="Precio" required />
            </div>
            <div>
              <input type="number" class="input input-bordered w-full" [(ngModel)]="nuevaDuracion" name="duracion" placeholder="Duración (min)" required />
            </div>
            <button type="submit" class="btn btn-primary gap-2">
              <app-icon name="plus" [size]="18" />
              Agregar
            </button>
          </form>
        </div>
      </div>

      <!-- Categorías -->
      @if (categorias().length > 0) {
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-sm" [class.btn-primary]="categoriaFiltro() === ''" [class.btn-ghost]="categoriaFiltro() !== ''" (click)="filtrarCategoria('')">
            Todas
          </button>
          @for (cat of categorias(); track cat) {
            <button class="btn btn-sm" [class.btn-primary]="categoriaFiltro() === cat" [class.btn-ghost]="categoriaFiltro() !== cat" (click)="filtrarCategoria(cat)">
              {{ cat }}
            </button>
          }
        </div>
      }

      <!-- Lista -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Duración</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (servicio of serviciosFiltrados(); track servicio.idServicio) {
                  <tr class="hover:bg-base-200/50" [class.opacity-60]="!servicio.vigente">
                    <td>
                      <div class="flex items-center gap-3">
                        <div class="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                          <app-icon name="scissors" [size]="18" />
                        </div>
                        <div>
                          <div class="font-medium">{{ servicio.nombre }}</div>
                          @if (servicio.descripcion) {
                            <div class="text-xs text-base-content/60">{{ servicio.descripcion }}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (servicio.categoria) {
                        <span class="badge badge-ghost badge-sm">{{ servicio.categoria }}</span>
                      } @else {
                        <span class="text-sm text-base-content/50">—</span>
                      }
                    </td>
                    <td class="tabular-nums font-medium">{{ servicio.precio | pesos }}</td>
                    <td>
                      <span class="badge badge-ghost gap-1">
                        <app-icon name="clock" [size]="12" />
                        {{ servicio.duracionMinutos }} min
                      </span>
                    </td>
                    <td>
                      @if (servicio.vigente) {
                        <span class="badge badge-success badge-sm">Vigente</span>
                      } @else {
                        <span class="badge badge-error badge-sm">No vigente</span>
                      }
                    </td>
                    <td class="text-right">
                      <div class="flex flex-wrap items-center justify-end gap-1">
                        <button class="btn btn-ghost btn-sm" (click)="verHistorial(servicio)" title="Historial de precios">
                          <app-icon name="calendar" [size]="16" />
                        </button>
                        <button class="btn btn-ghost btn-sm" (click)="editar(servicio)" title="Editar">
                          <app-icon name="edit" [size]="16" />
                        </button>
                        @if (servicio.vigente) {
                          <button class="btn btn-ghost btn-sm text-error hover:bg-error/10" (click)="confirmarEliminar(servicio)" title="Marcar no vigente">
                            <app-icon name="trash" [size]="16" />
                          </button>
                        } @else {
                          <button class="btn btn-ghost btn-sm text-success hover:bg-success/10" (click)="restaurar(servicio)" title="Restaurar">
                            <app-icon name="check" [size]="16" />
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center py-12 text-base-content/60">
                      <div class="flex flex-col items-center gap-3">
                        <app-icon name="scissors" [size]="40" />
                        <div>
                          <p class="font-medium">No hay servicios</p>
                          <p class="text-sm">Agregá el primero arriba</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal editar -->
    <dialog #editarModal class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="text-lg font-bold mb-4">Editar servicio</h3>
        @if (servicioEditando(); as s) {
          <form (ngSubmit)="guardarEdicion()" class="space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Nombre</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="s.nombre" name="editNombre" required />
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div class="form-control">
                <label class="label"><span class="label-text">Categoría</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="s.categoria" name="editCategoria" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">URL Imagen</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="s.urlImagen" name="editUrlImagen" />
              </div>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div class="form-control">
                <label class="label"><span class="label-text">Precio</span></label>
                <input type="number" class="input input-bordered w-full" [(ngModel)]="s.precio" name="editPrecio" required />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Duración (min)</span></label>
                <input type="number" class="input input-bordered w-full" [(ngModel)]="s.duracionMinutos" name="editDuracion" required />
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Descripción</span></label>
              <textarea class="textarea textarea-bordered w-full" [(ngModel)]="s.descripcion" name="editDescripcion"></textarea>
            </div>
            <div class="form-control">
              <label class="label cursor-pointer gap-3">
                <span class="label-text">Vigente</span>
                <input type="checkbox" class="toggle toggle-primary" [(ngModel)]="s.vigente" name="editVigente" />
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

    <!-- Modal historial -->
    <dialog #historialModal class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="text-lg font-bold mb-4">
          @if (servicioSeleccionado(); as s) {
            Historial de {{ s.nombre }}
          }
        </h3>
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Precio</th>
                <th>Duración</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (h of historial(); track h.idHistorial) {
                <tr class="hover:bg-base-200/50">
                  <td>{{ h.fechaCambio | fechaAr:'cortaHora' }}</td>
                  <td class="tabular-nums font-medium">{{ h.precio | pesos }}</td>
                  <td>
                    <span class="badge badge-ghost gap-1">
                      <app-icon name="clock" [size]="12" />
                      {{ h.duracionMinutos }} min
                    </span>
                  </td>
                  <td>
                    @if (h.vigente) {
                      <span class="badge badge-success badge-sm">Vigente</span>
                    } @else {
                      <span class="badge badge-error badge-sm">No vigente</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-8 text-base-content/60">
                    <div class="flex flex-col items-center gap-2">
                      <app-icon name="calendar" [size]="32" />
                      <span>No hay historial registrado</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="modal-action">
          <button class="btn btn-primary" (click)="cerrarHistorial()">Cerrar</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="cerrarHistorial()">close</button>
      </form>
    </dialog>

    <!-- Modal confirmar eliminar -->
    <dialog #eliminarModal class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold text-error">Marcar como no vigente</h3>
        @if (servicioSeleccionado(); as s) {
          <p class="py-4">
            ¿Estás seguro de que querés marcar <strong>{{ s.nombre }}</strong> como no vigente? Ya no aparecerá en las reservas públicas.
          </p>
        }
        <div class="modal-action">
          <button class="btn btn-ghost" (click)="cerrarEliminar()">Cancelar</button>
          <button class="btn btn-error" [class.btn-loading]="eliminando()" [disabled]="eliminando()" (click)="eliminar()">Desactivar</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="cerrarEliminar()">close</button>
      </form>
    </dialog>
  `,
})
export class ServiciosComponent implements OnInit {
  private readonly serviciosService = inject(ServiciosService);

  @ViewChild('editarModal') editarModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('historialModal') historialModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('eliminarModal') eliminarModalRef!: ElementRef<HTMLDialogElement>;

  servicios = signal<Servicio[]>([]);
  categorias = signal<string[]>([]);
  categoriaFiltro = signal('');
  mostrarNoVigentes = true;

  serviciosFiltrados = computed(() => {
    let lista = this.servicios();
    if (!this.mostrarNoVigentes) {
      lista = lista.filter((s) => s.vigente);
    }
    if (this.categoriaFiltro()) {
      lista = lista.filter((s) => s.categoria === this.categoriaFiltro());
    }
    return lista;
  });

  servicioSeleccionado = signal<Servicio | null>(null);
  servicioEditando = signal<Servicio | null>(null);
  historial = signal<ServicioHistorial[]>([]);
  guardando = signal(false);
  eliminando = signal(false);

  nuevoNombre = '';
  nuevaCategoria = '';
  nuevoPrecio = '';
  nuevaDuracion = '';

  ngOnInit(): void {
    this.loadServicios();
    this.loadCategorias();
  }

  loadServicios(): void {
    this.serviciosService.findAll().subscribe((s) => this.servicios.set(s));
  }

  loadCategorias(): void {
    this.serviciosService.findCategorias().subscribe((c) => this.categorias.set(c));
  }

  toggleVigentes(): void {
    // El computed se recalcula automáticamente
  }

  filtrarCategoria(cat: string): void {
    this.categoriaFiltro.set(cat);
  }

  crear(): void {
    if (!this.nuevoNombre || !this.nuevoPrecio || !this.nuevaDuracion) return;

    const data: CreateServicioRequest = {
      nombre: this.nuevoNombre,
      categoria: this.nuevaCategoria || undefined,
      precio: Number(this.nuevoPrecio),
      duracionMinutos: Number(this.nuevaDuracion),
    };

    this.serviciosService.create(data).subscribe(() => {
      this.nuevoNombre = '';
      this.nuevaCategoria = '';
      this.nuevoPrecio = '';
      this.nuevaDuracion = '';
      this.loadServicios();
      this.loadCategorias();
    });
  }

  editar(servicio: Servicio): void {
    this.servicioEditando.set({ ...servicio });
    this.editarModalRef.nativeElement.showModal();
  }

  cerrarEditar(): void {
    this.editarModalRef.nativeElement.close();
    this.servicioEditando.set(null);
  }

  guardarEdicion(): void {
    const s = this.servicioEditando();
    if (!s || !s.nombre) return;

    this.guardando.set(true);
    const data: UpdateServicioRequest = {
      nombre: s.nombre,
      descripcion: s.descripcion || undefined,
      categoria: s.categoria || undefined,
      precio: Number(s.precio),
      duracionMinutos: Number(s.duracionMinutos),
      urlImagen: s.urlImagen || undefined,
      vigente: s.vigente,
    };

    this.serviciosService.update(s.idServicio, data).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarEditar();
        this.loadServicios();
        this.loadCategorias();
      },
      error: () => {
        this.guardando.set(false);
      },
    });
  }

  verHistorial(servicio: Servicio): void {
    this.servicioSeleccionado.set(servicio);
    this.historial.set(servicio.historial || []);
    this.historialModalRef.nativeElement.showModal();

    // Refrescar historial desde el servidor
    this.serviciosService.findOne(servicio.idServicio).subscribe((s) => {
      this.servicioSeleccionado.set(s);
      this.historial.set(s.historial || []);
    });
  }

  cerrarHistorial(): void {
    this.historialModalRef.nativeElement.close();
    this.servicioSeleccionado.set(null);
    this.historial.set([]);
  }

  confirmarEliminar(servicio: Servicio): void {
    this.servicioSeleccionado.set(servicio);
    this.eliminarModalRef.nativeElement.showModal();
  }

  cerrarEliminar(): void {
    this.eliminarModalRef.nativeElement.close();
    this.servicioSeleccionado.set(null);
  }

  eliminar(): void {
    const s = this.servicioSeleccionado();
    if (!s) return;

    this.eliminando.set(true);
    this.serviciosService.remove(s.idServicio).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.cerrarEliminar();
        this.loadServicios();
      },
      error: () => {
        this.eliminando.set(false);
      },
    });
  }

  restaurar(servicio: Servicio): void {
    this.serviciosService.update(servicio.idServicio, { vigente: true }).subscribe(() => {
      this.loadServicios();
    });
  }
}
