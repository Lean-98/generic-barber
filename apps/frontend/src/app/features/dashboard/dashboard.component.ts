import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TurnosService } from '../../shared/services/turnos.service';
import { PersonasService } from '../../shared/services/personas.service';
import { ServiciosService } from '../../shared/services/servicios.service';
import { Turno, TurnoDetalle } from '../../shared/models/turno.model';
import { Persona } from '../../shared/models/persona.model';
import { Servicio } from '../../shared/models/servicio.model';
import { Producto } from '../../shared/models/producto.model';
import { ProductosService } from '../../shared/services/productos.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { FechaArPipe } from '../../shared/pipes/fecha-ar.pipe';
import { PesosPipe } from '../../shared/pipes/pesos.pipe';
import { fechaLocal } from '../../shared/utils/fecha-local.util';
import { BrandingService } from '../../core/services/branding.service';
import { CumpleanosService, CumpleanosProximo } from '../../shared/services/cumpleanos.service';
import { whatsappDeTelefono } from '../../shared/utils/whatsapp.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, IconComponent, FechaArPipe, PesosPipe],
  template: `
    <div class="space-y-8 text-base-content">
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="font-display text-3xl font-medium tracking-tight">Dashboard</h1>
          <p class="text-base-content/60 mt-1">Resumen del día de hoy</p>
        </div>
        <a routerLink="/turnos/nuevo" class="btn btn-primary gap-2">
          <app-icon name="plus" [size]="18" />
          Nuevo Turno
        </a>
      </div>

      <!-- Aviso de stock bajo (solo productos que controlan stock) -->
      @if (stockBajo().length > 0) {
        <div class="alert alert-warning items-start">
          <app-icon name="shopping-bag" [size]="20" />
          <div class="flex-1">
            <div class="font-medium">
              {{ stockBajo().length === 1 ? 'Hay 1 producto' : 'Hay ' + stockBajo().length + ' productos' }} con poco stock
            </div>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              @for (p of stockBajo(); track p.idProducto) {
                <span>{{ p.nombre }}: <strong>{{ p.stock === 0 ? 'sin stock' : p.stock }}</strong></span>
              }
            </div>
          </div>
          <a routerLink="/productos" class="btn btn-sm">Ver productos</a>
        </div>
      }

      <!-- Cumpleaños de la semana (con el cupón personal si ya se generó) -->
      @if (cumpleanos().length > 0) {
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-5">
            <div class="flex items-center gap-2">
              <app-icon name="star" [size]="18" className="text-primary" />
              <h2 class="font-medium">Cumpleaños de esta semana</h2>
            </div>
            <ul class="mt-2 divide-y divide-base-200">
              @for (c of cumpleanos(); track c.idPersona) {
                <li class="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium">{{ c.nombre }} {{ c.apellido }}</span>
                      @if (c.esHoy) {
                        <span class="badge badge-primary badge-sm">¡Hoy! 🎂</span>
                      } @else {
                        <span class="badge badge-ghost badge-sm">{{ diaCumple(c.fecha) }}</span>
                      }
                      <span class="text-xs text-base-content/60">cumple {{ c.edad }}</span>
                    </div>
                    <div class="mt-0.5 text-xs text-base-content/60">
                      @if (c.cupon) {
                        Cupón <span class="font-mono">{{ c.cupon.codigo }}</span> ({{ c.cupon.descuentoPorcentaje }}%) ·
                        {{ c.cupon.usado ? 'ya lo usó' : 'vale hasta el ' + c.cupon.hasta }}
                      } @else if (!c.recibePromociones) {
                        No acepta promociones
                      } @else if (!c.mail) {
                        Sin email: no recibe el cupón automático
                      } @else {
                        El cupón sale por mail {{ branding().cumpleActivo ? 'los días antes del cumple' : 'cuando actives el beneficio en Marca' }}
                      }
                    </div>
                  </div>
                  @if (linkWhatsapp(c); as link) {
                    <a [href]="link" target="_blank" rel="noopener" class="btn btn-sm gap-2 border-0 bg-[#25D366] text-white hover:bg-[#1ebe5a]">
                      <app-icon name="whatsapp" [size]="16" />
                      Saludar
                    </a>
                  }
                </li>
              }
            </ul>
          </div>
        </div>
      }

      <!-- Stats -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-base-content/60">Turnos hoy</span>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <app-icon name="calendar" [size]="16" />
            </span>
          </div>
          <div class="font-display tabular-nums mt-3 text-3xl font-medium">{{ turnosHoy().length }}</div>
        </div>

        <div class="rounded-lg bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-base-content/60">Ingresos hoy</span>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary">
              <app-icon name="credit-card" [size]="16" />
            </span>
          </div>
          <div class="font-display tabular-nums mt-3 text-3xl font-medium">{{ ingresosHoy() | pesos }}</div>
        </div>

        <div class="rounded-lg bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-base-content/60">Clientes</span>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
              <app-icon name="users" [size]="16" />
            </span>
          </div>
          <div class="font-display tabular-nums mt-3 text-3xl font-medium">{{ totalClientes() }}</div>
        </div>

        <div class="rounded-lg bg-base-100 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-base-content/60">Servicios</span>
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-base-200 text-base-content/60">
              <app-icon name="scissors" [size]="16" />
            </span>
          </div>
          <div class="font-display tabular-nums mt-3 text-3xl font-medium">{{ totalServicios() }}</div>
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
                        <div class="font-medium">{{ turno.fechaHoraInicio | fechaAr:'corta' }}</div>
                        <div class="text-sm text-base-content/60">{{ turno.fechaHoraInicio | fechaAr:'hora' }}</div>
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
                          <span class="text-sm text-base-content/60">—</span>
                        }
                      </td>
                      <td>
                        <a [routerLink]="['/personas']" class="btn btn-ghost btn-sm">Ver</a>
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
                      <td class="font-medium">{{ item.servicio.precio | pesos }}</td>
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
                  <span class="badge badge-ghost">{{ servicio.precio | pesos }}</span>
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
  private readonly productosService = inject(ProductosService);

  stockBajo = signal<Producto[]>([]);
  private readonly cumpleanosService = inject(CumpleanosService);
  private readonly brandingService = inject(BrandingService);
  branding = this.brandingService.branding;
  cumpleanos = signal<CumpleanosProximo[]>([]);

  turnos = signal<Turno[]>([]);
  turnosHoy = signal<Turno[]>([]);
  clientes = signal<Persona[]>([]);
  servicios = signal<Servicio[]>([]);
  totalClientes = signal(0);
  totalServicios = signal(0);

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

  /** "2026-11-13" → "vie 13/11". */
  diaCumple(fecha: string): string {
    const [a, m, d] = fecha.split('-').map(Number);
    const dia = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(a, m - 1, d).getDay()];
    return `${dia} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  }

  /**
   * Saludo por WhatsApp. Con cupón vigente y sin usar, incluye el código y
   * el link que lo carga en /reservar; si no, es solo el saludo (sin
   * prometer un descuento que no puede usar online).
   */
  linkWhatsapp(c: CumpleanosProximo): string | null {
    const saludo = c.esHoy ? `¡Feliz cumple, ${c.nombre}! 🎉` : `¡Se viene tu cumple, ${c.nombre}! 🎉`;
    let mensaje = `${saludo} Te esperamos para festejarlo.`;
    if (c.cupon && !c.cupon.usado && c.recibePromociones) {
      const link = `${window.location.origin}/reservar?cupon=${encodeURIComponent(c.cupon.codigo)}`;
      mensaje = `${saludo} Te regalamos ${c.cupon.descuentoPorcentaje}% de descuento para festejarlo: reservá hasta el ${c.cupon.hasta} con el código *${c.cupon.codigo}* acá: ${link}`;
    }
    return whatsappDeTelefono(c.telefono, mensaje);
  }

  ngOnInit(): void {
    this.cumpleanosService.proximos(7).subscribe({
      next: (lista) => this.cumpleanos.set(lista),
      error: () => this.cumpleanos.set([]),
    });
    this.productosService.findStockBajo().subscribe({
      next: (productos) => this.stockBajo.set(productos),
      error: () => this.stockBajo.set([]),
    });
    this.turnosService.findAll(undefined, undefined, 1, 200).subscribe((res) => {
      this.turnos.set(res.data);
      const hoy = fechaLocal();
      this.turnosHoy.set(res.data.filter((turno) => turno.fechaHoraInicio.startsWith(hoy)));
    });
    this.personasService.findAll(1, 200).subscribe((res) => {
      this.clientes.set(res.data);
      this.totalClientes.set(res.total);
    });
    this.serviciosService.findAll(undefined, undefined, 1, 200).subscribe((res) => {
      this.servicios.set(res.data);
      this.totalServicios.set(res.total);
    });
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
