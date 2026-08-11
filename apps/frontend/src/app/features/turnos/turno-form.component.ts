import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TurnosService } from '../../shared/services/turnos.service';
import { PersonasService } from '../../shared/services/personas.service';
import { ServiciosService } from '../../shared/services/servicios.service';
import { Persona } from '../../shared/models/persona.model';
import { Servicio } from '../../shared/models/servicio.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { fechaLocal } from '../../shared/utils/fecha-local.util';

@Component({
  selector: 'app-turno-form',
  standalone: true,
  imports: [FormsModule, IconComponent, PesosPipe],
  template: `
    <div class="mx-auto max-w-4xl space-y-6 text-base-content">
      <div class="flex items-center gap-4">
        <button class="btn btn-ghost btn-square" (click)="router.navigate(['/turnos'])">
          <app-icon name="arrow-left" [size]="20" />
        </button>
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Nuevo Turno</h1>
          <p class="text-base-content/60 mt-1">Completá los datos del cliente, servicios y horario</p>
        </div>
      </div>

      <div class="card bg-base-100 shadow-sm">
        <div class="card-body space-y-8">
          
          <!-- Cliente -->
          <section class="space-y-4">
            <div class="flex items-center gap-2">
              <div class="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">1</div>
              <h2 class="text-lg font-semibold">Cliente</h2>
            </div>
            
            @if (!clienteSeleccionado()) {
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Buscar cliente existente</span>
                </label>
                <div class="join w-full">
                  <input type="text" class="input input-bordered join-item w-full" [(ngModel)]="busquedaCliente" name="busqueda" placeholder="Escribí nombre o apellido..." (input)="buscarCliente()" />
                  <button class="btn join-item" [disabled]="!busquedaCliente">
                    <app-icon name="search" [size]="18" />
                  </button>
                </div>
              </div>
              
              @if (clientesEncontrados().length > 0) {
                <div class="rounded-box border bg-base-100 divide-y">
                  @for (cliente of clientesEncontrados(); track cliente.idPersona) {
                    <div class="flex items-center justify-between p-4 hover:bg-base-200/50 transition-colors">
                      <div class="flex items-center gap-3">
                        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-content">
                          {{ cliente.nombre.charAt(0) }}{{ cliente.apellido.charAt(0) }}
                        </div>
                        <div>
                          <p class="font-medium">{{ cliente.nombre }} {{ cliente.apellido }}</p>
                          <p class="text-sm text-base-content/60">{{ cliente.telefono }}</p>
                        </div>
                      </div>
                      <button class="btn btn-primary btn-sm" (click)="seleccionarCliente(cliente)">Seleccionar</button>
                    </div>
                  }
                </div>
              }
              
              <div class="divider text-sm text-base-content/50">o creá uno nuevo</div>
              
              <div class="grid gap-4 md:grid-cols-3">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Nombre</span>
                  </label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoClienteNombre" name="nuevoNombre" placeholder="Nombre" />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Apellido</span>
                  </label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoClienteApellido" name="nuevoApellido" placeholder="Apellido" />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Teléfono</span>
                  </label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="nuevoClienteTelefono" name="nuevoTelefono" placeholder="Teléfono" />
                </div>
              </div>
              <button class="btn btn-secondary gap-2" (click)="crearCliente()" [disabled]="!nuevoClienteNombre() || !nuevoClienteApellido()">
                <app-icon name="plus" [size]="18" />
                Crear cliente y seleccionar
              </button>
            } @else {
              <div class="alert alert-success">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-content">
                    {{ clienteSeleccionado()!.nombre.charAt(0) }}{{ clienteSeleccionado()!.apellido.charAt(0) }}
                  </div>
                  <div class="flex-1">
                    <p class="font-medium">{{ clienteSeleccionado()!.nombre }} {{ clienteSeleccionado()!.apellido }}</p>
                    <p class="text-sm opacity-80">{{ clienteSeleccionado()!.telefono }}</p>
                  </div>
                  <button class="btn btn-ghost btn-sm" (click)="limpiarCliente()">Cambiar</button>
                </div>
              </div>
            }
          </section>

          <div class="divider"></div>

          <!-- Servicios -->
          <section class="space-y-4">
            <div class="flex items-center gap-2">
              <div class="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">2</div>
              <h2 class="text-lg font-semibold">Servicios</h2>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Agregar servicio</span>
              </label>
              <div class="grid gap-3 md:grid-cols-4">
                <select class="select select-bordered md:col-span-2" [(ngModel)]="servicioSeleccionadoId" name="servicioSelect">
                  <option [value]="null">Seleccionar servicio</option>
                  @for (servicio of servicios(); track servicio.idServicio) {
                    <option [value]="servicio.idServicio">{{ servicio.nombre }} - {{ servicio.precio | pesos }} ({{ servicio.duracionMinutos }} min)</option>
                  }
                </select>
                <input type="number" class="input input-bordered" [(ngModel)]="cantidadServicio" name="cantidad" placeholder="Cantidad" min="1" />
                <button class="btn btn-primary gap-2" (click)="agregarServicio()" [disabled]="!servicioSeleccionadoId()">
                  <app-icon name="plus" [size]="18" />
                  Agregar
                </button>
              </div>
            </div>
            
            @if (serviciosSeleccionados().length > 0) {
              <div class="rounded-box border bg-base-100 divide-y">
                @for (item of serviciosSeleccionados(); track item.servicio.idServicio) {
                  <div class="flex items-center justify-between p-4">
                    <div>
                      <p class="font-medium">{{ item.servicio.nombre }}</p>
                      <p class="text-sm text-base-content/60">{{ item.servicio.precio | pesos }} x {{ item.cantidad }} = {{ calcularSubtotal(item) | pesos }}</p>
                    </div>
                    <button class="btn btn-ghost btn-sm text-error hover:bg-error/10" (click)="quitarServicio(item.servicio.idServicio)">
                      <app-icon name="trash" [size]="16" />
                    </button>
                  </div>
                }
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2 rounded-box bg-base-200/50 p-4">
                <span class="text-sm text-base-content/70">Duración total: <strong>{{ duracionTotal() }} minutos</strong></span>
                <span class="tabular-nums font-display text-lg font-semibold">Total estimado: {{ totalEstimado() | pesos }}</span>
              </div>
            } @else {
              <div class="rounded-box border border-dashed p-6 text-center text-base-content/60">
                <app-icon name="scissors" [size]="28" className="mx-auto mb-2" />
                <p>Seleccioná al menos un servicio</p>
              </div>
            }
          </section>

          <div class="divider"></div>

          <!-- Fecha y hora -->
          <section class="space-y-4">
            <div class="flex items-center gap-2">
              <div class="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">3</div>
              <h2 class="text-lg font-semibold">Fecha y hora</h2>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Fecha</span>
                </label>
                <input type="date" class="input input-bordered w-full" [(ngModel)]="fecha" name="fecha" />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Hora</span>
                </label>
                <input type="time" class="input input-bordered w-full" [(ngModel)]="hora" name="hora" />
              </div>
            </div>
          </section>

          <div class="divider"></div>

          <!-- Observaciones -->
          <section class="space-y-4">
            <h2 class="text-lg font-semibold">Observaciones</h2>
            <textarea class="textarea textarea-bordered w-full" [(ngModel)]="observacion" name="observacion" placeholder="Notas adicionales..."></textarea>
          </section>

          <!-- Submit -->
          <div class="flex items-center justify-end gap-3 pt-2">
            <button class="btn btn-ghost" (click)="router.navigate(['/turnos'])">Cancelar</button>
            <button class="btn btn-primary gap-2" [class.btn-loading]="loading()" [disabled]="!puedeCrear() || loading()" (click)="crearTurno()">
              @if (loading()) {
                <app-icon name="loader" [size]="18" className="animate-spin-slow" />
              } @else {
                <app-icon name="check" [size]="18" />
              }
              {{ loading() ? 'Creando...' : 'Crear Turno' }}
            </button>
          </div>
          
          @if (error()) {
            <div class="alert alert-error">
              <app-icon name="alert-circle" [size]="20" />
              <span>{{ error() }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class TurnoFormComponent implements OnInit {
  private readonly turnosService = inject(TurnosService);
  private readonly personasService = inject(PersonasService);
  private readonly serviciosService = inject(ServiciosService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  // Cliente
  busquedaCliente = '';
  clientesEncontrados = signal<Persona[]>([]);
  clienteSeleccionado = signal<Persona | null>(null);
  nuevoClienteNombre = signal('');
  nuevoClienteApellido = signal('');
  nuevoClienteTelefono = signal('');

  // Servicios
  servicios = signal<Servicio[]>([]);
  servicioSeleccionadoId = signal<string | null>(null);
  cantidadServicio = signal<number>(1);
  serviciosSeleccionados = signal<{ servicio: Servicio; cantidad: number }[]>([]);

  // Fecha y hora
  fecha = signal<string>('');
  hora = signal<string>('');
  observacion = signal<string>('');

  // Estado
  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.serviciosService.findAll(undefined, undefined, 1, 200).subscribe((res) => this.servicios.set(res.data));

    const params = this.route.snapshot.queryParams;
    const hoy = fechaLocal();
    this.fecha.set(params['fecha'] || hoy);
    this.hora.set(params['hora'] || '09:00');
  }

  buscarCliente(): void {
    if (this.busquedaCliente.length < 2) {
      this.clientesEncontrados.set([]);
      return;
    }
    this.personasService.search(this.busquedaCliente).subscribe((res) => this.clientesEncontrados.set(res.data));
  }

  seleccionarCliente(cliente: Persona): void {
    this.clienteSeleccionado.set(cliente);
    this.clientesEncontrados.set([]);
    this.busquedaCliente = '';
  }

  limpiarCliente(): void {
    this.clienteSeleccionado.set(null);
    this.nuevoClienteNombre.set('');
    this.nuevoClienteApellido.set('');
    this.nuevoClienteTelefono.set('');
  }

  crearCliente(): void {
    this.personasService.create({
      nombre: this.nuevoClienteNombre(),
      apellido: this.nuevoClienteApellido(),
      telefono: this.nuevoClienteTelefono() || undefined,
    }).subscribe((cliente) => {
      this.clienteSeleccionado.set(cliente);
    });
  }

  agregarServicio(): void {
    const id = Number(this.servicioSeleccionadoId());
    const servicio = this.servicios().find((s) => s.idServicio === id);
    if (!servicio) return;

    const existe = this.serviciosSeleccionados().find((item) => item.servicio.idServicio === id);
    if (existe) {
      this.serviciosSeleccionados.update((items) =>
        items.map((item) =>
          item.servicio.idServicio === id
            ? { ...item, cantidad: item.cantidad + this.cantidadServicio() }
            : item
        )
      );
    } else {
      this.serviciosSeleccionados.update((items) => [
        ...items,
        { servicio, cantidad: this.cantidadServicio() },
      ]);
    }
    this.servicioSeleccionadoId.set(null);
    this.cantidadServicio.set(1);
  }

  quitarServicio(id: number): void {
    this.serviciosSeleccionados.update((items) => items.filter((item) => item.servicio.idServicio !== id));
  }

  calcularSubtotal(item: { servicio: Servicio; cantidad: number }): number {
    return item.servicio.precio * item.cantidad;
  }

  totalEstimado(): number {
    return this.serviciosSeleccionados().reduce((total, item) => total + item.servicio.precio * item.cantidad, 0);
  }

  duracionTotal(): number {
    return this.serviciosSeleccionados().reduce((total, item) => total + item.servicio.duracionMinutos * item.cantidad, 0);
  }

  puedeCrear(): boolean {
    return !!this.clienteSeleccionado() && this.serviciosSeleccionados().length > 0 && !!this.fecha() && !!this.hora();
  }

  crearTurno(): void {
    this.loading.set(true);
    this.error.set('');

    const fechaHora = `${this.fecha()}T${this.hora()}:00`;

    this.turnosService.create({
      idPersona: this.clienteSeleccionado()!.idPersona,
      fechaHoraInicio: fechaHora,
      observacion: this.observacion() || undefined,
      servicios: this.serviciosSeleccionados().map((item) => ({
        idServicio: item.servicio.idServicio,
        cantidad: item.cantidad,
      })),
    }).subscribe({
      next: () => {
        this.router.navigate(['/turnos']);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al crear turno');
        this.loading.set(false);
      },
    });
  }
}
