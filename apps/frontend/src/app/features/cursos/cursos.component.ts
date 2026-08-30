import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CursosService } from '../../shared/services/cursos.service';
import { Curso, CreateCursoRequest, UpdateCursoRequest } from '../../shared/models/curso.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { ImageUploadComponent } from '../../shared/ui/image-upload.component';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { PaginationComponent } from '../../shared/ui/pagination.component';

const LIMITE_PAGINA = 20;

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [FormsModule, IconComponent, ImageUploadComponent, PesosPipe, PaginationComponent],
  template: `
    <div class="space-y-6 text-base-content">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Cursos</h1>
          <p class="text-base-content/60 mt-1">Capacitaciones y cursos que ofrecés, mostrados en la landing</p>
        </div>
        <div class="flex items-center gap-2">
          <label class="label cursor-pointer gap-2 bg-base-100 px-4 py-2 rounded-lg border shadow-sm">
            <span class="label-text text-sm">Mostrar no vigentes</span>
            <input type="checkbox" class="toggle toggle-sm toggle-primary" [(ngModel)]="mostrarNoVigentes" (change)="toggleVigentes()" />
          </label>
          <button class="btn btn-primary gap-2" (click)="abrirCrear()">
            <app-icon name="plus" [size]="18" />
            Agregar
          </button>
        </div>
      </div>

      <!-- Lista -->
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Precio</th>
                  <th>Duración</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (curso of cursos(); track curso.idCurso) {
                  <tr class="hover:bg-base-200/50" [class.opacity-60]="!curso.vigente">
                    <td>
                      <div class="flex items-center gap-3">
                        <div class="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                          <app-icon name="graduation-cap" [size]="18" />
                        </div>
                        <div>
                          <div class="font-medium">{{ curso.nombre }}</div>
                          @if (curso.descripcion) {
                            <div class="text-xs text-base-content/60">{{ curso.descripcion }}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="tabular-nums font-medium">{{ curso.precio | pesos }}</td>
                    <td>
                      @if (curso.duracion) {
                        <span class="badge badge-ghost badge-sm">{{ curso.duracion }}</span>
                      } @else {
                        <span class="text-sm text-base-content/60">—</span>
                      }
                    </td>
                    <td>
                      @if (curso.vigente) {
                        <span class="badge badge-success badge-sm">Vigente</span>
                      } @else {
                        <span class="badge badge-error badge-sm">No vigente</span>
                      }
                    </td>
                    <td class="text-right">
                      <div class="flex flex-wrap items-center justify-end gap-1">
                        <button class="btn btn-ghost btn-sm" (click)="editar(curso)" title="Editar" aria-label="Editar">
                          <app-icon name="edit" [size]="16" />
                        </button>
                        @if (curso.vigente) {
                          <button class="btn btn-ghost btn-sm text-error hover:bg-error/10" (click)="confirmarEliminar(curso)" title="Marcar no vigente" aria-label="Marcar no vigente">
                            <app-icon name="trash" [size]="16" />
                          </button>
                        } @else {
                          <button class="btn btn-ghost btn-sm text-success hover:bg-success/10" (click)="restaurar(curso)" title="Restaurar" aria-label="Restaurar">
                            <app-icon name="check" [size]="16" />
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="text-center py-12 text-base-content/60">
                      <div class="flex flex-col items-center gap-3">
                        <app-icon name="graduation-cap" [size]="40" />
                        <div>
                          <p class="font-medium">No hay cursos</p>
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
        <h3 class="text-lg font-bold mb-4">Agregar curso</h3>
        <form (ngSubmit)="crear()" class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Nombre</span></label>
            <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoNombre" name="nombre" placeholder="Nombre del curso" required />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Subtítulo</span></label>
            <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoSubtitulo" name="subtitulo" placeholder="Ej: Aprendé barbería desde cero" />
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="form-control">
              <label class="label"><span class="label-text">Duración</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevaDuracion" name="duracion" placeholder="Ej: 3 meses" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Cupos</span></label>
              <input type="number" class="input input-bordered w-full" [(ngModel)]="nuevosCupos" name="cupos" placeholder="Ej: 10" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Fecha de inicio</span></label>
              <input type="date" class="input input-bordered w-full" [(ngModel)]="nuevaFechaInicio" name="fechaInicio" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Fecha de fin</span></label>
              <input type="date" class="input input-bordered w-full" [(ngModel)]="nuevaFechaFin" name="fechaFin" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Horario</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoHorario" name="horario" placeholder="A confirmar" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Lugar</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoLugar" name="lugar" placeholder="Dirección" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Inscripción desde</span></label>
              <input type="date" class="input input-bordered w-full" [(ngModel)]="nuevaInscripcionInicio" name="inscripcionInicio" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Inscripción hasta</span></label>
              <input type="date" class="input input-bordered w-full" [(ngModel)]="nuevaInscripcionHasta" name="inscripcionHasta" />
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Días de cursada</span></label>
            <div class="flex flex-wrap gap-2">
              @for (dia of diasSemana; track dia) {
                <label class="label cursor-pointer gap-2 rounded-lg border px-3 py-1.5">
                  <input type="checkbox" class="checkbox checkbox-sm" [checked]="nuevoDiaCursada.includes(dia)" (change)="toggleDiaNuevo(dia)" />
                  <span class="label-text text-sm">{{ dia }}</span>
                </label>
              }
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Imagen</span></label>
            <app-image-upload [folder]="'cursos'" [(url)]="nuevaUrlImagen" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Precio</span></label>
            <input type="number" class="input input-bordered w-full" [(ngModel)]="nuevoPrecio" name="precio" placeholder="Precio" required />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Descripción</span></label>
            <textarea class="textarea textarea-bordered w-full" [(ngModel)]="nuevaDescripcion" name="descripcion"></textarea>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Temario (un ítem por línea)</span></label>
            <textarea class="textarea textarea-bordered w-full" rows="5" [(ngModel)]="nuevoTemario" name="temario" placeholder="Manejo de máquinas y herramientas&#10;Técnicas de corte y degradados"></textarea>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Aviso destacado</span></label>
            <textarea class="textarea textarea-bordered w-full" [(ngModel)]="nuevoRequisito" name="requisito" placeholder="Ej: Contar con modelo a partir de la 2da clase"></textarea>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" (click)="cerrarCrear()">Cancelar</button>
            <button type="submit" class="btn btn-primary gap-2" [class.btn-loading]="creando()" [disabled]="creando() || !nuevoNombre || !nuevoPrecio">
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

    <!-- Modal editar -->
    <dialog #editarModal class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="text-lg font-bold mb-4">Editar curso</h3>
        @if (cursoEditando(); as c) {
          <form (ngSubmit)="guardarEdicion()" class="space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Nombre</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="c.nombre" name="editNombre" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Subtítulo</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="c.subtitulo" name="editSubtitulo" />
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div class="form-control">
                <label class="label"><span class="label-text">Duración</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="c.duracion" name="editDuracion" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Cupos</span></label>
                <input type="number" class="input input-bordered w-full" [(ngModel)]="c.cupos" name="editCupos" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Fecha de inicio</span></label>
                <input type="date" class="input input-bordered w-full" [(ngModel)]="fechaInicioEditando" name="editFechaInicio" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Fecha de fin</span></label>
                <input type="date" class="input input-bordered w-full" [(ngModel)]="fechaFinEditando" name="editFechaFin" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Horario</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="c.horario" name="editHorario" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Lugar</span></label>
                <input type="text" class="input input-bordered w-full" [(ngModel)]="c.lugar" name="editLugar" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Inscripción desde</span></label>
                <input type="date" class="input input-bordered w-full" [(ngModel)]="inscripcionInicioEditando" name="editInscripcionInicio" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Inscripción hasta</span></label>
                <input type="date" class="input input-bordered w-full" [(ngModel)]="inscripcionHastaEditando" name="editInscripcionHasta" />
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Días de cursada</span></label>
              <div class="flex flex-wrap gap-2">
                @for (dia of diasSemana; track dia) {
                  <label class="label cursor-pointer gap-2 rounded-lg border px-3 py-1.5">
                    <input type="checkbox" class="checkbox checkbox-sm" [checked]="diaCursadaEditando.includes(dia)" (change)="toggleDiaEditando(dia)" />
                    <span class="label-text text-sm">{{ dia }}</span>
                  </label>
                }
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Imagen</span></label>
              <app-image-upload [folder]="'cursos'" [(url)]="c.urlImagen" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Precio</span></label>
              <input type="number" class="input input-bordered w-full" [(ngModel)]="c.precio" name="editPrecio" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Descripción</span></label>
              <textarea class="textarea textarea-bordered w-full" [(ngModel)]="c.descripcion" name="editDescripcion"></textarea>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Temario (un ítem por línea)</span></label>
              <textarea class="textarea textarea-bordered w-full" rows="5" [(ngModel)]="temarioEditando" name="editTemario"></textarea>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Aviso destacado</span></label>
              <textarea class="textarea textarea-bordered w-full" [(ngModel)]="c.requisitoImportante" name="editRequisito"></textarea>
            </div>
            <div class="form-control">
              <label class="label cursor-pointer gap-3">
                <span class="label-text">Vigente</span>
                <input type="checkbox" class="toggle toggle-primary" [(ngModel)]="c.vigente" name="editVigente" />
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

    <!-- Modal confirmar eliminar -->
    <dialog #eliminarModal class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold text-error">Marcar como no vigente</h3>
        @if (cursoSeleccionado(); as c) {
          <p class="py-4">
            ¿Estás seguro de que querés marcar <strong>{{ c.nombre }}</strong> como no vigente? Ya no aparecerá en la landing.
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
export class CursosComponent implements OnInit {
  private readonly cursosService = inject(CursosService);

  @ViewChild('crearModal') crearModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('editarModal') editarModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('eliminarModal') eliminarModalRef!: ElementRef<HTMLDialogElement>;

  cursos = signal<Curso[]>([]);
  mostrarNoVigentes = true;
  pagina = signal(1);
  totalPaginas = signal(1);
  total = signal(0);

  cursoSeleccionado = signal<Curso | null>(null);
  cursoEditando = signal<Curso | null>(null);
  guardando = signal(false);
  eliminando = signal(false);
  creando = signal(false);

  readonly diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  nuevoNombre = '';
  nuevoSubtitulo = '';
  nuevoPrecio = '';
  nuevaDuracion = '';
  nuevaDescripcion = '';
  nuevaUrlImagen = '';
  nuevoTemario = '';
  nuevaFechaInicio = '';
  nuevaFechaFin = '';
  nuevoDiaCursada: string[] = [];
  nuevoHorario = '';
  nuevoLugar = '';
  nuevosCupos = '';
  nuevaInscripcionInicio = '';
  nuevaInscripcionHasta = '';
  nuevoRequisito = '';

  temarioEditando = '';
  diaCursadaEditando: string[] = [];
  fechaInicioEditando = '';
  fechaFinEditando = '';
  inscripcionInicioEditando = '';
  inscripcionHastaEditando = '';

  ngOnInit(): void {
    this.loadCursos();
  }

  loadCursos(): void {
    const vigente = this.mostrarNoVigentes ? undefined : true;
    this.cursosService.findAll(vigente, this.pagina(), LIMITE_PAGINA).subscribe((res) => {
      this.cursos.set(res.data);
      this.total.set(res.total);
      this.totalPaginas.set(res.totalPages);
    });
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.loadCursos();
  }

  toggleVigentes(): void {
    this.pagina.set(1);
    this.loadCursos();
  }

  abrirCrear(): void {
    this.nuevoNombre = '';
    this.nuevoSubtitulo = '';
    this.nuevoPrecio = '';
    this.nuevaDuracion = '';
    this.nuevaDescripcion = '';
    this.nuevaUrlImagen = '';
    this.nuevoTemario = '';
    this.nuevaFechaInicio = '';
    this.nuevaFechaFin = '';
    this.nuevoDiaCursada = [];
    this.nuevoHorario = '';
    this.nuevoLugar = '';
    this.nuevosCupos = '';
    this.nuevaInscripcionInicio = '';
    this.nuevaInscripcionHasta = '';
    this.nuevoRequisito = '';
    this.crearModalRef.nativeElement.showModal();
  }

  cerrarCrear(): void {
    this.crearModalRef.nativeElement.close();
  }

  toggleDiaNuevo(dia: string): void {
    const i = this.nuevoDiaCursada.indexOf(dia);
    if (i >= 0) this.nuevoDiaCursada.splice(i, 1);
    else this.nuevoDiaCursada.push(dia);
  }

  toggleDiaEditando(dia: string): void {
    const i = this.diaCursadaEditando.indexOf(dia);
    if (i >= 0) this.diaCursadaEditando.splice(i, 1);
    else this.diaCursadaEditando.push(dia);
  }

  crear(): void {
    if (!this.nuevoNombre || !this.nuevoPrecio) return;

    const data: CreateCursoRequest = {
      nombre: this.nuevoNombre,
      subtitulo: this.nuevoSubtitulo || undefined,
      duracion: this.nuevaDuracion || undefined,
      precio: Number(this.nuevoPrecio),
      descripcion: this.nuevaDescripcion || undefined,
      urlImagen: this.nuevaUrlImagen || undefined,
      temario: this.parseTemario(this.nuevoTemario),
      fechaInicio: this.nuevaFechaInicio || undefined,
      fechaFin: this.nuevaFechaFin || undefined,
      diaCursada: this.nuevoDiaCursada,
      horario: this.nuevoHorario || undefined,
      lugar: this.nuevoLugar || undefined,
      cupos: this.nuevosCupos ? Number(this.nuevosCupos) : undefined,
      inscripcionInicio: this.nuevaInscripcionInicio || undefined,
      inscripcionHasta: this.nuevaInscripcionHasta || undefined,
      requisitoImportante: this.nuevoRequisito || undefined,
    };

    this.creando.set(true);
    this.cursosService.create(data).subscribe({
      next: () => {
        this.creando.set(false);
        this.cerrarCrear();
        this.loadCursos();
      },
      error: () => {
        this.creando.set(false);
      },
    });
  }

  editar(curso: Curso): void {
    this.cursoEditando.set({ ...curso });
    this.temarioEditando = (curso.temario ?? []).join('\n');
    this.diaCursadaEditando = [...(curso.diaCursada ?? [])];
    this.fechaInicioEditando = this.toDateInputValue(curso.fechaInicio);
    this.fechaFinEditando = this.toDateInputValue(curso.fechaFin);
    this.inscripcionInicioEditando = this.toDateInputValue(curso.inscripcionInicio);
    this.inscripcionHastaEditando = this.toDateInputValue(curso.inscripcionHasta);
    this.editarModalRef.nativeElement.showModal();
  }

  cerrarEditar(): void {
    this.editarModalRef.nativeElement.close();
    this.cursoEditando.set(null);
  }

  guardarEdicion(): void {
    const c = this.cursoEditando();
    if (!c || !c.nombre) return;

    this.guardando.set(true);
    const data: UpdateCursoRequest = {
      nombre: c.nombre,
      subtitulo: c.subtitulo || undefined,
      descripcion: c.descripcion || undefined,
      duracion: c.duracion || undefined,
      precio: Number(c.precio),
      urlImagen: c.urlImagen || undefined,
      temario: this.parseTemario(this.temarioEditando),
      fechaInicio: this.fechaInicioEditando || undefined,
      fechaFin: this.fechaFinEditando || undefined,
      diaCursada: this.diaCursadaEditando,
      horario: c.horario || undefined,
      lugar: c.lugar || undefined,
      cupos: c.cupos !== undefined && c.cupos !== null ? Number(c.cupos) : undefined,
      inscripcionInicio: this.inscripcionInicioEditando || undefined,
      inscripcionHasta: this.inscripcionHastaEditando || undefined,
      requisitoImportante: c.requisitoImportante || undefined,
      vigente: c.vigente,
    };

    this.cursosService.update(c.idCurso, data).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarEditar();
        this.loadCursos();
      },
      error: () => {
        this.guardando.set(false);
      },
    });
  }

  confirmarEliminar(curso: Curso): void {
    this.cursoSeleccionado.set(curso);
    this.eliminarModalRef.nativeElement.showModal();
  }

  cerrarEliminar(): void {
    this.eliminarModalRef.nativeElement.close();
    this.cursoSeleccionado.set(null);
  }

  eliminar(): void {
    const c = this.cursoSeleccionado();
    if (!c) return;

    this.eliminando.set(true);
    this.cursosService.remove(c.idCurso).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.cerrarEliminar();
        this.loadCursos();
      },
      error: () => {
        this.eliminando.set(false);
      },
    });
  }

  restaurar(curso: Curso): void {
    this.cursosService.update(curso.idCurso, { vigente: true }).subscribe(() => {
      this.loadCursos();
    });
  }

  private parseTemario(texto: string): string[] {
    return texto
      .split('\n')
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0);
  }

  private toDateInputValue(iso?: string): string {
    return iso ? iso.slice(0, 10) : '';
  }
}
