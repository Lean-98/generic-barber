import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReservasPublicasService } from '../../shared/services/reservas-publicas.service';
import { ServiciosService } from '../../shared/services/servicios.service';
import { Servicio } from '../../shared/models/servicio.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { FechaArPipe } from '../../shared/pipes/fecha-ar.pipe';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-reservar',
  standalone: true,
  imports: [FormsModule, IconComponent, FechaArPipe, PesosPipe],
  template: `
    <div class="min-h-screen bg-base-200 py-8 px-4 md:py-12 text-base-content">
      <div class="mx-auto max-w-4xl space-y-8">

        <!-- Header -->
        <div class="text-center space-y-3">
          @if (branding().logoUrl || branding().iconoUrl; as url) {
            <img [src]="url" [alt]="branding().nombre" class="mx-auto h-16 w-16 rounded-2xl object-cover" />
          } @else {
            <div class="avatar placeholder mx-auto">
              <div class="bg-primary text-primary-content w-16 rounded-2xl">
                <app-icon name="scissors" [size]="32" />
              </div>
            </div>
          }
          <p class="text-sm font-medium uppercase tracking-[0.15em] text-primary">{{ branding().nombre }}</p>
          <h1 class="text-3xl font-medium tracking-tight md:text-4xl">Reservar Turno</h1>
          <p class="text-base-content/60 max-w-md mx-auto">Seleccioná los servicios, fecha y horario para tu turno. Te enviaremos un recordatorio.</p>
        </div>

        <!-- Paso 1: Servicios -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <div class="mb-4 flex items-center gap-3">
              <div class="bg-primary text-primary-content flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">1</div>
              <h2 class="card-title text-lg">Seleccionar servicios</h2>
            </div>
            
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (servicio of servicios(); track servicio.idServicio) {
                <div 
                  class="card cursor-pointer border-2 transition-all hover:shadow-md"
                  [class.border-primary]="servicioSeleccionado(servicio.idServicio)"
                  [class.bg-primary/5]="servicioSeleccionado(servicio.idServicio)"
                  [class.border-base-300]="!servicioSeleccionado(servicio.idServicio)"
                  (click)="toggleServicio(servicio)"
                >
                  <div class="card-body p-4">
                    <div class="flex items-start justify-between">
                      <div>
                        <p class="font-semibold">{{ servicio.nombre }}</p>
                        <p class="text-sm text-base-content/60 flex items-center gap-1">
                          <app-icon name="clock" [size]="14" />
                          {{ servicio.duracionMinutos }} min
                        </p>
                      </div>
                      <p class="tabular-nums font-semibold text-primary">{{ servicio.precio | pesos }}</p>
                    </div>
                    @if (servicioSeleccionado(servicio.idServicio)) {
                      <div class="mt-4 flex items-center gap-2">
                        <label class="text-sm font-medium">Cantidad:</label>
                        <input 
                          type="number" 
                          min="1" 
                          class="input input-bordered input-sm w-20"
                          [(ngModel)]="cantidades()[servicio.idServicio]"
                          (click)="$event.stopPropagation()"
                        />
                        <div class="ml-auto text-primary">
                          <app-icon name="check-circle" [size]="20" />
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            
            @if (serviciosSeleccionados().length > 0) {
              <div class="mt-6 flex items-center justify-between rounded-box bg-base-200/50 p-4">
                <span class="text-sm text-base-content/70">Duración total: <strong>{{ duracionTotal() }} min</strong></span>
                <span class="font-display tabular-nums text-lg font-semibold">Total: {{ totalPrecio() | pesos }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Paso 2: Fecha -->
        @if (serviciosSeleccionados().length > 0) {
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <div class="mb-4 flex items-center gap-3">
                <div class="bg-primary text-primary-content flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">2</div>
                <h2 class="card-title text-lg">Seleccionar fecha</h2>
              </div>
              
              <div class="mb-4 flex items-center justify-center gap-3">
                <button class="btn btn-outline btn-sm gap-2" (click)="cambiarSemana(-1)">
                  <app-icon name="arrow-left" [size]="16" />
                  Anterior
                </button>
                <span class="font-semibold min-w-[200px] text-center">{{ semanaLabel() }}</span>
                <button class="btn btn-outline btn-sm gap-2" (click)="cambiarSemana(1)">
                  Siguiente
                  <app-icon name="arrow-right" [size]="16" />
                </button>
              </div>
              
              <div class="grid grid-cols-7 gap-2">
                @for (dia of diasSemana(); track dia.fecha) {
                  <div class="space-y-2">
                    <div class="text-center text-xs font-medium uppercase tracking-wide text-base-content/60">
                      {{ dia.nombre }}
                    </div>
                    <button 
                      class="btn w-full"
                      [class.btn-primary]="fechaSeleccionada() === dia.fecha"
                      [class.btn-outline]="fechaSeleccionada() !== dia.fecha"
                      [class.opacity-50]="!dia.habilitado"
                      [disabled]="!dia.habilitado"
                      (click)="dia.habilitado && seleccionarFecha(dia.fecha)"
                    >
                      <span class="text-lg font-bold">{{ dia.diaNumero }}</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- Paso 3: Horario -->
        @if (fechaSeleccionada()) {
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <div class="mb-4 flex items-center gap-3">
                <div class="bg-primary text-primary-content flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">3</div>
                <h2 class="card-title text-lg">Seleccionar horario</h2>
              </div>
              <p class="text-sm text-base-content/60 mb-4">Slots disponibles para {{ fechaSeleccionada() | fechaAr:'completa' }}</p>
              
              @if (slots().length > 0) {
                <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  @for (slot of slots(); track slot) {
                    <button 
                      class="btn"
                      [class.btn-primary]="slotSeleccionado() === slot"
                      [class.btn-outline]="slotSeleccionado() !== slot"
                      (click)="seleccionarSlot(slot)"
                    >
                      {{ slot | fechaAr:'hora' }}
                    </button>
                  }
                </div>
              } @else {
                <div class="rounded-box border border-dashed p-8 text-center text-base-content/60">
                  <app-icon name="calendar" [size]="32" className="mx-auto mb-2" />
                  <p>No hay horarios disponibles para esta fecha.</p>
                  <p class="text-sm">Probá con otra fecha.</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- Paso 4: Datos -->
        @if (slotSeleccionado()) {
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body">
              <div class="mb-4 flex items-center gap-3">
                <div class="bg-primary text-primary-content flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">4</div>
                <h2 class="card-title text-lg">Tus datos</h2>
              </div>
              
              <div class="grid gap-4 md:grid-cols-2">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Nombre</span>
                  </label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="nombre" name="nombre" placeholder="Tu nombre" required />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Apellido</span>
                  </label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="apellido" name="apellido" placeholder="Tu apellido" required />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Email</span>
                  </label>
                  <input type="email" class="input input-bordered w-full" [(ngModel)]="email" name="email" placeholder="tu@email.com" required />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Teléfono</span>
                  </label>
                  <input type="text" class="input input-bordered w-full" [(ngModel)]="telefono" name="telefono" placeholder="+54 11 1234-5678" />
                </div>
              </div>
              
              <div class="form-control mt-2">
                <label class="label">
                  <span class="label-text font-medium">Notas (opcional)</span>
                </label>
                <textarea class="textarea textarea-bordered w-full" [(ngModel)]="observacion" name="observacion" placeholder="Alguna nota especial..."></textarea>
              </div>
              
              <div class="mt-6 flex flex-col items-end gap-3 sm:flex-row sm:justify-between">
                <div class="text-sm text-base-content/70">
                  Fecha: <strong>{{ slotSeleccionado() | fechaAr:'completa' }}</strong> a las <strong>{{ slotSeleccionado() | fechaAr:'hora' }}</strong>
                </div>
                <button class="btn btn-primary gap-2 w-full sm:w-auto" [class.btn-loading]="loading()" [disabled]="!puedeReservar() || loading()" (click)="reservar()">
                  @if (loading()) {
                    <app-icon name="loader" [size]="18" className="animate-spin-slow" />
                  } @else {
                    <app-icon name="check" [size]="18" />
                  }
                  {{ loading() ? 'Reservando...' : 'Confirmar Reserva' }}
                </button>
              </div>
              
              @if (error()) {
                <div class="alert alert-error mt-4">
                  <app-icon name="alert-circle" [size]="20" />
                  <span>{{ error() }}</span>
                </div>
              }
              
              @if (exito()) {
                <div class="alert alert-success mt-4">
                  <app-icon name="check-circle" [size]="20" />
                  <div class="flex-1">
                    <p class="font-medium">¡Turno reservado con éxito!</p>
                    <p class="text-sm opacity-90">Te enviaremos un recordatorio por email. Si el peluquero tiene Google Calendar conectado, el turno aparecerá automáticamente.</p>
                    <button class="btn btn-primary btn-sm mt-3 gap-2" (click)="reset()">
                      <app-icon name="plus" [size]="16" />
                      Reservar otro
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
        
      </div>
    </div>
  `,
})
export class ReservarComponent implements OnInit {
  private readonly reservasService = inject(ReservasPublicasService);
  private readonly serviciosService = inject(ServiciosService);
  private readonly router = inject(Router);
  private readonly brandingService = inject(BrandingService);
  branding = this.brandingService.branding;

  // Servicios
  servicios = signal<Servicio[]>([]);
  serviciosSeleccionados = signal<Servicio[]>([]);
  cantidades = signal<Record<number, number>>({});

  // Fecha y slots
  fechaActual = signal(new Date());
  fechaSeleccionada = signal<string | null>(null);
  slotSeleccionado = signal<string | null>(null);
  slots = signal<string[]>([]);

  // Cliente
  nombre = signal('');
  apellido = signal('');
  email = signal('');
  telefono = signal('');
  observacion = signal('');

  // Estado
  loading = signal(false);
  error = signal('');
  exito = signal(false);

  ngOnInit(): void {
    this.serviciosService.findAll().subscribe((s) => {
      this.servicios.set(s.filter((sv) => sv.vigente));
    });
  }

  toggleServicio(servicio: Servicio): void {
    const seleccionados = this.serviciosSeleccionados();
    const existe = seleccionados.find((s) => s.idServicio === servicio.idServicio);
    
    if (existe) {
      this.serviciosSeleccionados.set(seleccionados.filter((s) => s.idServicio !== servicio.idServicio));
      const cantidades = { ...this.cantidades() };
      delete cantidades[servicio.idServicio];
      this.cantidades.set(cantidades);
    } else {
      this.serviciosSeleccionados.set([...seleccionados, servicio]);
      this.cantidades.update((c) => ({ ...c, [servicio.idServicio]: 1 }));
    }
    
    // Reset fecha y slots
    this.fechaSeleccionada.set(null);
    this.slotSeleccionado.set(null);
    this.slots.set([]);
  }

  servicioSeleccionado(id: number): boolean {
    return this.serviciosSeleccionados().some((s) => s.idServicio === id);
  }

  duracionTotal(): number {
    return this.serviciosSeleccionados().reduce(
      (total, s) => total + s.duracionMinutos * (this.cantidades()[s.idServicio] || 1),
      0
    );
  }

  totalPrecio(): number {
    return this.serviciosSeleccionados().reduce(
      (total, s) => total + Number(s.precio) * (this.cantidades()[s.idServicio] || 1),
      0
    );
  }

  // Calendario
  semanaLabel(): string {
    const inicio = this.inicioSemana();
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);
    return `${inicio.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${fin.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  inicioSemana(): Date {
    const hoy = this.fechaActual();
    const dia = hoy.getDay();
    const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1); // Lunes como inicio
    const inicio = new Date(hoy);
    inicio.setDate(diff);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  }

  diasSemana(): { fecha: string; nombre: string; diaNumero: number; habilitado: boolean }[] {
    const inicio = this.inicioSemana();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + i);
      const nombres = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      return {
        fecha: fecha.toISOString().split('T')[0],
        nombre: nombres[i],
        diaNumero: fecha.getDate(),
        habilitado: fecha >= hoy,
      };
    });
  }

  cambiarSemana(direccion: number): void {
    const nueva = new Date(this.fechaActual());
    nueva.setDate(nueva.getDate() + direccion * 7);
    this.fechaActual.set(nueva);
  }

  seleccionarFecha(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
    this.slotSeleccionado.set(null);
    this.slots.set([]);
    this.error.set('');
    
    const ids = this.serviciosSeleccionados().map((s) => s.idServicio).join(',');
    this.reservasService.getDisponibilidad(fecha, ids).subscribe({
      next: (resp) => {
        this.slots.set(resp.slots);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al consultar disponibilidad');
      },
    });
  }

  seleccionarSlot(slot: string): void {
    this.slotSeleccionado.set(slot);
  }

  puedeReservar(): boolean {
    return !!this.nombre() && !!this.apellido() && !!this.email() && !!this.slotSeleccionado();
  }

  reservar(): void {
    this.loading.set(true);
    this.error.set('');
    
    this.reservasService.reservar({
      nombre: this.nombre(),
      apellido: this.apellido(),
      email: this.email(),
      telefono: this.telefono() || undefined,
      fechaHoraInicio: this.slotSeleccionado()!,
      observacion: this.observacion() || undefined,
      servicios: this.serviciosSeleccionados().map((s) => ({
        idServicio: s.idServicio,
        cantidad: this.cantidades()[s.idServicio] || 1,
      })),
    }).subscribe({
      next: () => {
        this.exito.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al reservar el turno');
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    this.serviciosSeleccionados.set([]);
    this.cantidades.set({});
    this.fechaSeleccionada.set(null);
    this.slotSeleccionado.set(null);
    this.slots.set([]);
    this.nombre.set('');
    this.apellido.set('');
    this.email.set('');
    this.telefono.set('');
    this.observacion.set('');
    this.exito.set(false);
    this.error.set('');
  }
}
