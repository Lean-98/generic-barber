import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TurnosService } from '../../shared/services/turnos.service';
import { PersonasService } from '../../shared/services/personas.service';
import { ServiciosService } from '../../shared/services/servicios.service';
import { Turno, TurnoDetalle } from '../../shared/models/turno.model';
import { Persona } from '../../shared/models/persona.model';
import { Servicio } from '../../shared/models/servicio.model';
import { IconComponent } from '../../shared/ui/icon.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, IconComponent],
  template: `
    <div class="space-y-8 text-base-content">
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p class="text-base-content/60 mt-1">Resumen del día de hoy</p>
        </div>
        <a routerLink="/turnos/nuevo" class="btn btn-primary gap-2">
          <app-icon name="plus" [size]="18" />
          Nuevo Turno
        </a>
      </div>

      <!-- Stats -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="stats bg-primary text-primary-content shadow-sm">
          <div class="stat">
            <div class="stat-figure">
              <app-icon name="calendar" [size]="28" />
            </div>
            <div class="stat-title text-primary-content/80">Turnos Hoy</div>
            <div class="stat-value text-3xl">{{ turnosHoy().length }}</div>
          </div>
        </div>

        <div class="stats bg-base-100 shadow-sm">
          <div class="stat">
            <div class="stat-figure text-success">
              <app-icon name="credit-card" [size]="28" />
            </div>
            <div class="stat-title">Ingresos Hoy</div>
            <div class="stat-value text-3xl">\${{ ingresosHoy() }}</div>
          </div>
        </div>

        <div class="stats bg-base-100 shadow-sm">
          <div class="stat">
            <div class="stat-figure text-primary">
              <app-icon name="users" [size]="28" />
            </div>
            <div class="stat-title">Clientes</div>
            <div class="stat-value text-3xl">{{ clientes().length }}</div>
          </div>
        </div>

        <div class="stats bg-base-100 shadow-sm">
          <div class="stat">
            <div class="stat-figure text-primary">
              <app-icon name="scissors" [size]="28" />
            </div>
            <div class="stat-title">Servicios</div>
            <div class="stat-value text-3xl">{{ servicios().length }}</div>
          </div>
        </div>
      </div>

      <!-- Main content grid -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Próximos turnos -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="card-title text-lg">Próximos Turnos</h2>
              <a routerLink="/turnos" class="btn btn-ghost btn-sm">Ver todos</a>
            </div>

            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (turno of turnos().slice(0, 5); track turno.idTurno) {
                    <tr class="hover:bg-base-200/50">
                      <td>
                        <div class="flex items-center gap-3">
                          <div class="avatar placeholder">
                            <div class="bg-neutral text-neutral-content w-8 rounded-full">
                              <span class="text-xs">{{ iniciales(turno.persona) }}</span>
                            </div>
                          </div>
                          <div>
                            <div class="font-medium">{{ turno.persona?.nombre }} {{ turno.persona?.apellido }}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="font-medium">{{ turno.fechaHoraInicio | date:'shortDate' }}</div>
                        <div class="text-sm text-base-content/60">{{ turno.fechaHoraInicio | date:'shortTime' }}</div>
                      </td>
                      <td>
                        <span class="badge gap-1" [class]="getEstadoClasses(turno.estado)">
                          {{ turno.estado }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3" class="text-center py-8 text-base-content/60">
                        <div class="flex flex-col items-center gap-2">
                          <app-icon name="calendar" [size]="32" />
                          <span>No hay turnos programados</span>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Últimos clientes -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="card-title text-lg">Últimos Clientes</h2>
              <a routerLink="/personas" class="btn btn-ghost btn-sm">Ver todos</a>
            </div>

            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contacto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (cliente of ultimosClientes(); track cliente.idPersona) {
                    <tr class="hover:bg-base-200/50">
                      <td>
                        <div class="flex items-center gap-3">
                          <div class="avatar placeholder">
                            <div class="bg-primary text-primary-content w-8 rounded-full">
                              <span class="text-xs">{{ iniciales(cliente) }}</span>
                            </div>
                          </div>
                          <div class="font-medium">{{ cliente.nombre }} {{ cliente.apellido }}</div>
                        </div>
                      </td>
                      <td>
                        @if (cliente.telefono) {
                          <span class="text-sm">{{ cliente.telefono }}</span>
                        } @else {
                          <span class="text-sm text-base-content/50">—</span>
                        }
                      </td>
                      <td>
                        <a [routerLink]="['/personas']" class="btn btn-ghost btn-xs">Ver</a>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3" class="text-center py-8 text-base-content/60">
                        <div class="flex flex-col items-center gap-2">
                          <app-icon name="users" [size]="32" />
                          <span>No hay clientes registrados</span>
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

      <!-- Servicios -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Servicios más solicitados -->
        <div class="card bg-base-100 shadow-sm lg:col-span-2">
          <div class="card-body">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="card-title text-lg">Servicios más solicitados</h2>
              <a routerLink="/servicios" class="btn btn-ghost btn-sm">Ver todos</a>
            </div>

            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Duración</th>
                    <th>Precio</th>
                    <th class="text-right">Reservas</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of serviciosPopulares(); track item.servicio.idServicio) {
                    <tr class="hover:bg-base-200/50">
                      <td>
                        <div class="flex items-center gap-3">
                          <div class="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                            <app-icon name="scissors" [size]="18" />
                          </div>
                          <span class="font-medium">{{ item.servicio.nombre }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-ghost gap-1">
                          <app-icon name="clock" [size]="12" />
                          {{ item.servicio.duracionMinutos }} min
                        </span>
                      </td>
                      <td class="font-medium">\${{ item.servicio.precio }}</td>
                      <td class="text-right">
                        <span class="badge badge-primary">{{ item.cantidad }}</span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="text-center py-8 text-base-content/60">
                        <div class="flex flex-col items-center gap-2">
                          <app-icon name="scissors" [size]="32" />
                          <span>Todavía no hay reservas de servicios</span>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Resumen servicios -->
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title text-lg mb-4">Servicios Activos</h2>
            <div class="space-y-3">
              @for (servicio of servicios().slice(0, 6); track servicio.idServicio) {
                <div class="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p class="font-medium">{{ servicio.nombre }}</p>
                    <p class="text-sm text-base-content/60">{{ servicio.duracionMinutos }} min</p>
                  </div>
                  <span class="badge badge-ghost">\${{ servicio.precio }}</span>
                </div>
              } @empty {
                <div class="text-center py-8 text-base-content/60">
                  <div class="flex flex-col items-center gap-2">
                    <app-icon name="scissors" [size]="32" />
                    <span>No hay servicios</span>
                  </div>
                </div>
              }
            </div>
            @if (servicios().length > 6) {
              <a routerLink="/servicios" class="btn btn-ghost btn-sm mt-4 w-full">Ver {{ servicios().length - 6 }} servicios más</a>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly turnosService = inject(TurnosService);
  private readonly personasService = inject(PersonasService);
  private readonly serviciosService = inject(ServiciosService);

  turnos = signal<Turno[]>([]);
  turnosHoy = signal<Turno[]>([]);
  clientes = signal<Persona[]>([]);
  servicios = signal<Servicio[]>([]);

  ultimosClientes = computed(() =>
    [...this.clientes()]
      .sort((a, b) => b.idPersona - a.idPersona)
      .slice(0, 5)
  );

  ingresosHoy = computed(() => {
    return this.turnosHoy()
      .filter((t) => t.estado === 'COMPLETADO')
      .reduce((total, turno) => {
        const detalles = turno.detalles || [];
        return total + detalles.reduce((sub, d) => sub + Number(d.precioReal) * d.cantidad, 0);
      }, 0);
  });

  serviciosPopulares = computed(() => {
    const conteo = new Map<number, { servicio: Servicio; cantidad: number }>();

    this.turnos().forEach((turno) => {
      if (turno.estado === 'CANCELADO' || turno.estado === 'NO_SHOW') return;
      (turno.detalles || []).forEach((detalle) => {
        const servicio = this.servicios().find((s) => s.idServicio === detalle.idServicio);
        if (!servicio) return;
        const actual = conteo.get(servicio.idServicio);
        if (actual) {
          actual.cantidad += detalle.cantidad;
        } else {
          conteo.set(servicio.idServicio, { servicio, cantidad: detalle.cantidad });
        }
      });
    });

    return Array.from(conteo.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  });

  ngOnInit(): void {
    this.turnosService.findAll().subscribe((t) => {
      this.turnos.set(t);
      const hoy = new Date().toISOString().split('T')[0];
      this.turnosHoy.set(t.filter((turno) => turno.fechaHoraInicio.startsWith(hoy)));
    });
    this.personasService.findAll().subscribe((c) => this.clientes.set(c));
    this.serviciosService.findAll().subscribe((s) => this.servicios.set(s));
  }

  iniciales(persona?: { nombre?: string; apellido?: string }): string {
    if (!persona) return '?';
    const n = persona.nombre?.charAt(0) ?? '';
    const a = persona.apellido?.charAt(0) ?? '';
    return `${n}${a}`.toUpperCase() || '?';
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
