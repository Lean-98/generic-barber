import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductosService } from '../../shared/services/productos.service';
import { CategoriasService } from '../../shared/services/categorias.service';
import { Producto, CreateProductoRequest, UpdateProductoRequest } from '../../shared/models/producto.model';
import { Categoria } from '../../shared/models/categoria.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { ImageUploadComponent } from '../../shared/ui/image-upload.component';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { PaginationComponent } from '../../shared/ui/pagination.component';

const LIMITE_PAGINA = 20;

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [FormsModule, IconComponent, ImageUploadComponent, PesosPipe, PaginationComponent],
  template: `
    <div class="space-y-6 text-base-content">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Productos</h1>
          <p class="text-base-content/60 mt-1">Artículos que vendés, mostrados en la landing</p>
        </div>
        <div class="flex items-center gap-2">
          <label class="label cursor-pointer gap-2 bg-base-100 px-4 py-2 rounded-lg border shadow-sm">
            <span class="label-text text-sm">Mostrar no vigentes</span>
            <input type="checkbox" class="toggle toggle-sm toggle-primary" [(ngModel)]="mostrarNoVigentes" (change)="toggleVigentes()" />
          </label>
          <button class="btn btn-ghost gap-2" (click)="abrirCategorias()">
            <app-icon name="tag" [size]="18" />
            Categorías
          </button>
          <button class="btn btn-primary gap-2" (click)="abrirCrear()">
            <app-icon name="plus" [size]="18" />
            Agregar
          </button>
        </div>
      </div>

      <!-- Categorías -->
      @if (categorias().length > 0) {
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-sm" [class.btn-primary]="categoriaFiltro() === undefined" [class.btn-ghost]="categoriaFiltro() !== undefined" (click)="filtrarCategoria(undefined)">
            Todas
          </button>
          @for (cat of categorias(); track cat.idCategoria) {
            <button class="btn btn-sm" [class.btn-primary]="categoriaFiltro() === cat.idCategoria" [class.btn-ghost]="categoriaFiltro() !== cat.idCategoria" (click)="filtrarCategoria(cat.idCategoria)">
              {{ cat.nombre }}
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
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (producto of productos(); track producto.idProducto) {
                  <tr class="hover:bg-base-200/50" [class.opacity-60]="!producto.vigente">
                    <td>
                      <div class="flex items-center gap-3">
                        <div class="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                          <app-icon name="shopping-bag" [size]="18" />
                        </div>
                        <div>
                          <div class="font-medium">{{ producto.nombre }}</div>
                          @if (producto.descripcion) {
                            <div class="text-xs text-base-content/60">{{ producto.descripcion }}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (producto.categoria) {
                        <span class="badge badge-ghost badge-sm">{{ producto.categoria.nombre }}</span>
                      } @else {
                        <span class="text-sm text-base-content/50">—</span>
                      }
                    </td>
                    <td class="tabular-nums font-medium">{{ producto.precio | pesos }}</td>
                    <td>
                      @if (producto.vigente) {
                        <span class="badge badge-success badge-sm">Vigente</span>
                      } @else {
                        <span class="badge badge-error badge-sm">No vigente</span>
                      }
                    </td>
                    <td class="text-right">
                      <div class="flex flex-wrap items-center justify-end gap-1">
                        <button class="btn btn-ghost btn-sm" (click)="editar(producto)" title="Editar">
                          <app-icon name="edit" [size]="16" />
                        </button>
                        @if (producto.vigente) {
                          <button class="btn btn-ghost btn-sm text-error hover:bg-error/10" (click)="confirmarEliminar(producto)" title="Marcar no vigente">
                            <app-icon name="trash" [size]="16" />
                          </button>
                        } @else {
                          <button class="btn btn-ghost btn-sm text-success hover:bg-success/10" (click)="restaurar(producto)" title="Restaurar">
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
                        <app-icon name="shopping-bag" [size]="40" />
                        <div>
                          <p class="font-medium">No hay productos</p>
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
        <h3 class="text-lg font-bold mb-4">Agregar producto</h3>
        <form (ngSubmit)="crear()" class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Nombre</span></label>
            <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoNombre" name="nombre" placeholder="Nombre del producto" required />
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="form-control">
              <label class="label"><span class="label-text">Categoría</span></label>
              <select class="select select-bordered w-full" [(ngModel)]="nuevaCategoria" name="categoria">
                <option [ngValue]="undefined">Sin categoría</option>
                @for (cat of categorias(); track cat.idCategoria) {
                  <option [ngValue]="cat.idCategoria">{{ cat.nombre }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Imagen</span></label>
            <app-image-upload [folder]="'productos'" [(url)]="nuevaUrlImagen" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Precio</span></label>
            <input type="number" class="input input-bordered w-full" [(ngModel)]="nuevoPrecio" name="precio" placeholder="Precio" required />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Descripción</span></label>
            <textarea class="textarea textarea-bordered w-full" [(ngModel)]="nuevaDescripcion" name="descripcion"></textarea>
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
        <h3 class="text-lg font-bold mb-4">Editar producto</h3>
        @if (productoEditando(); as p) {
          <form (ngSubmit)="guardarEdicion()" class="space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Nombre</span></label>
              <input type="text" class="input input-bordered w-full" [(ngModel)]="p.nombre" name="editNombre" required />
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div class="form-control">
                <label class="label"><span class="label-text">Categoría</span></label>
                <select class="select select-bordered w-full" [(ngModel)]="p.idCategoria" name="editCategoria">
                  <option [ngValue]="undefined">Sin categoría</option>
                  @for (cat of categorias(); track cat.idCategoria) {
                    <option [ngValue]="cat.idCategoria">{{ cat.nombre }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Imagen</span></label>
              <app-image-upload [folder]="'productos'" [(url)]="p.urlImagen" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Precio</span></label>
              <input type="number" class="input input-bordered w-full" [(ngModel)]="p.precio" name="editPrecio" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Descripción</span></label>
              <textarea class="textarea textarea-bordered w-full" [(ngModel)]="p.descripcion" name="editDescripcion"></textarea>
            </div>
            <div class="form-control">
              <label class="label cursor-pointer gap-3">
                <span class="label-text">Vigente</span>
                <input type="checkbox" class="toggle toggle-primary" [(ngModel)]="p.vigente" name="editVigente" />
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
        @if (productoSeleccionado(); as p) {
          <p class="py-4">
            ¿Estás seguro de que querés marcar <strong>{{ p.nombre }}</strong> como no vigente? Ya no aparecerá en la landing.
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

    <!-- Modal categorías -->
    <dialog #categoriasModal class="modal">
      <div class="modal-box max-w-md">
        <h3 class="text-lg font-bold mb-4">Gestionar categorías</h3>
        <form (ngSubmit)="crearCategoria()" class="flex gap-2 mb-4">
          <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevaCategoriaNombre" name="nuevaCategoriaNombre" placeholder="Nueva categoría" />
          <button type="submit" class="btn btn-primary" [disabled]="!nuevaCategoriaNombre">
            <app-icon name="plus" [size]="18" />
          </button>
        </form>
        <ul class="divide-y divide-base-200">
          @for (cat of todasCategorias(); track cat.idCategoria) {
            <li class="flex items-center justify-between py-2">
              <span [class.opacity-50]="!cat.vigente">{{ cat.nombre }}</span>
              @if (cat.vigente) {
                <button class="btn btn-ghost btn-xs text-error" (click)="desactivarCategoria(cat)">Desactivar</button>
              } @else {
                <button class="btn btn-ghost btn-xs text-success" (click)="reactivarCategoria(cat)">Reactivar</button>
              }
            </li>
          } @empty {
            <li class="py-4 text-center text-sm text-base-content/60">No hay categorías todavía</li>
          }
        </ul>
        <div class="modal-action">
          <button class="btn btn-primary" (click)="cerrarCategorias()">Cerrar</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="cerrarCategorias()">close</button>
      </form>
    </dialog>
  `,
})
export class ProductosComponent implements OnInit {
  private readonly productosService = inject(ProductosService);
  private readonly categoriasService = inject(CategoriasService);

  @ViewChild('crearModal') crearModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('editarModal') editarModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('eliminarModal') eliminarModalRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('categoriasModal') categoriasModalRef!: ElementRef<HTMLDialogElement>;

  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  todasCategorias = signal<Categoria[]>([]);
  categoriaFiltro = signal<number | undefined>(undefined);
  mostrarNoVigentes = true;
  pagina = signal(1);
  totalPaginas = signal(1);
  total = signal(0);

  productoSeleccionado = signal<Producto | null>(null);
  productoEditando = signal<Producto | null>(null);
  guardando = signal(false);
  eliminando = signal(false);
  creando = signal(false);

  nuevoNombre = '';
  nuevaCategoria: number | undefined = undefined;
  nuevoPrecio = '';
  nuevaDescripcion = '';
  nuevaUrlImagen = '';
  nuevaCategoriaNombre = '';

  ngOnInit(): void {
    this.loadProductos();
    this.loadCategorias();
  }

  loadProductos(): void {
    const vigente = this.mostrarNoVigentes ? undefined : true;
    this.productosService.findAll(vigente, this.categoriaFiltro(), this.pagina(), LIMITE_PAGINA).subscribe((res) => {
      this.productos.set(res.data);
      this.total.set(res.total);
      this.totalPaginas.set(res.totalPages);
    });
  }

  loadCategorias(): void {
    this.categoriasService.findAll(true).subscribe((c) => this.categorias.set(c));
    this.categoriasService.findAll().subscribe((c) => this.todasCategorias.set(c));
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.loadProductos();
  }

  toggleVigentes(): void {
    this.pagina.set(1);
    this.loadProductos();
  }

  filtrarCategoria(idCategoria: number | undefined): void {
    this.categoriaFiltro.set(idCategoria);
    this.pagina.set(1);
    this.loadProductos();
  }

  abrirCrear(): void {
    this.nuevoNombre = '';
    this.nuevaCategoria = undefined;
    this.nuevoPrecio = '';
    this.nuevaDescripcion = '';
    this.nuevaUrlImagen = '';
    this.crearModalRef.nativeElement.showModal();
  }

  cerrarCrear(): void {
    this.crearModalRef.nativeElement.close();
  }

  crear(): void {
    if (!this.nuevoNombre || !this.nuevoPrecio) return;

    const data: CreateProductoRequest = {
      nombre: this.nuevoNombre,
      idCategoria: this.nuevaCategoria,
      precio: Number(this.nuevoPrecio),
      descripcion: this.nuevaDescripcion || undefined,
      urlImagen: this.nuevaUrlImagen || undefined,
    };

    this.creando.set(true);
    this.productosService.create(data).subscribe({
      next: () => {
        this.creando.set(false);
        this.cerrarCrear();
        this.loadProductos();
      },
      error: () => {
        this.creando.set(false);
      },
    });
  }

  editar(producto: Producto): void {
    this.productoEditando.set({ ...producto });
    this.editarModalRef.nativeElement.showModal();
  }

  cerrarEditar(): void {
    this.editarModalRef.nativeElement.close();
    this.productoEditando.set(null);
  }

  guardarEdicion(): void {
    const p = this.productoEditando();
    if (!p || !p.nombre) return;

    this.guardando.set(true);
    const data: UpdateProductoRequest = {
      nombre: p.nombre,
      descripcion: p.descripcion || undefined,
      idCategoria: p.idCategoria,
      precio: Number(p.precio),
      urlImagen: p.urlImagen || undefined,
      vigente: p.vigente,
    };

    this.productosService.update(p.idProducto, data).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarEditar();
        this.loadProductos();
      },
      error: () => {
        this.guardando.set(false);
      },
    });
  }

  confirmarEliminar(producto: Producto): void {
    this.productoSeleccionado.set(producto);
    this.eliminarModalRef.nativeElement.showModal();
  }

  cerrarEliminar(): void {
    this.eliminarModalRef.nativeElement.close();
    this.productoSeleccionado.set(null);
  }

  eliminar(): void {
    const p = this.productoSeleccionado();
    if (!p) return;

    this.eliminando.set(true);
    this.productosService.remove(p.idProducto).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.cerrarEliminar();
        this.loadProductos();
      },
      error: () => {
        this.eliminando.set(false);
      },
    });
  }

  restaurar(producto: Producto): void {
    this.productosService.update(producto.idProducto, { vigente: true }).subscribe(() => {
      this.loadProductos();
    });
  }

  abrirCategorias(): void {
    this.loadCategorias();
    this.categoriasModalRef.nativeElement.showModal();
  }

  cerrarCategorias(): void {
    this.categoriasModalRef.nativeElement.close();
  }

  crearCategoria(): void {
    if (!this.nuevaCategoriaNombre) return;
    this.categoriasService.create({ nombre: this.nuevaCategoriaNombre }).subscribe(() => {
      this.nuevaCategoriaNombre = '';
      this.loadCategorias();
    });
  }

  desactivarCategoria(categoria: Categoria): void {
    this.categoriasService.remove(categoria.idCategoria).subscribe(() => this.loadCategorias());
  }

  reactivarCategoria(categoria: Categoria): void {
    this.categoriasService.update(categoria.idCategoria, { vigente: true }).subscribe(() => this.loadCategorias());
  }
}
