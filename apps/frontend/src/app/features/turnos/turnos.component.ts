import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { TurnosService } from '../../shared/services/turnos.service';
import { Turno } from '../../shared/models/turno.model';
import { IconComponent } from '../../shared/ui/icon.component';
import { FechaArPipe } from '../../shared/pipes/fecha-ar.pipe';

interface DiaCalendario {
  fecha: Date;
  label: string;
  key: string;
}

interface TurnoVisual {
  turno: Turno;
  top: number;
  height: number;
  left: number;
  width: number;
}

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [RouterLink, IconComponent, FechaArPipe],
  template: `
    <div class="space-y-6 text-base-content">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-3xl font-medium tracking-tight">Turnos</h1>
          <p class="text-base-content/60 mt-1">Gestión de turnos y estados</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="join">
            <button class="btn join-item btn-sm" (click)="semanaAnterior()">
              <app-icon name="arrow-left" [size]="16" />
            </button>
            <span class="join-item bg-base-200 px-3 py-2 text-sm font-medium flex items-center">
              {{ fechaSemana() | fechaAr:'diaMes' }} - {{ finSemana() | fechaAr:'diaMesAnio' }}
            </span>
            <button class="btn join-item btn-sm" (click)="semanaSiguiente()">
              <app-icon name="arrow-right" [size]="16" />
            </button>
          </div>
          <button class="btn btn-sm btn-ghost" (click)="hoy()">Hoy</button>

          <div class="join">
            <button class="btn join-item btn-sm" [class.btn-active]="vista() === 'lista'" (click)="vista.set('lista')">
              <app-icon name="menu" [size]="16" />
              Lista
            </button>
            <button class="btn join-item btn-sm" [class.btn-active]="vista() === 'calendario'" (click)="vista.set('calendario')">
              <app-icon name="calendar" [size]="16" />
              Calendario
            </button>
          </div>

          <button routerLink="/turnos/nuevo" class="btn btn-primary btn-sm gap-2">
            <app-icon name="plus" [size]="16" />
            Nuevo Turno
          </button>
        </div>
      </div>

      @if (vista() === 'lista') {
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th class="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (turno of turnos(); track turno.idTurno) {
                    <tr class="hover:bg-base-200/50">
                      <td>
                        <div class="flex items-center gap-3">
                          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral text-xs font-semibold text-neutral-content">
                            {{ iniciales(turno.persona) }}
                          </div>
                          <div>
                            <div class="font-medium">{{ turno.persona?.nombre }} {{ turno.persona?.apellido }}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="font-medium">{{ turno.fechaHoraInicio | fechaAr:'corta' }}</div>
                        <div class="text-sm text-base-content/60 flex items-center gap-1">
                          <app-icon name="clock" [size]="14" />
                          {{ turno.fechaHoraInicio | fechaAr:'hora' }}
                        </div>
                      </td>
                      <td>
                        <span class="badge gap-1" [class]="getEstadoClasses(turno.estado)">
                          {{ turno.estado }}
                        </span>
                      </td>
                      <td class="text-right">
                        <div class="flex flex-wrap items-center justify-end gap-1">
                          @if (turno.estado === 'PENDIENTE') {
                            <button class="btn btn-ghost btn-xs gap-1" (click)="confirmar(turno.idTurno)">
                              <app-icon name="check" [size]="14" />
                              Confirmar
                            </button>
                          }
                          @if (turno.estado === 'CONFIRMADO') {
                            <button class="btn btn-ghost btn-xs gap-1" (click)="iniciar(turno.idTurno)">
                              Iniciar
                            </button>
                          }
                          @if (turno.estado === 'EN_PROCESO') {
                            <button class="btn btn-ghost btn-xs gap-1" (click)="finalizar(turno.idTurno)">
                              Finalizar
                            </button>
                          }
                          @if (turno.estado === 'COMPLETADO') {
                            <button class="btn btn-primary btn-xs gap-1" (click)="pagar(turno.idTurno)">
                              <app-icon name="credit-card" [size]="14" />
                              Pagar
                            </button>
                          }
                          @if (turno.estado === 'PENDIENTE' || turno.estado === 'CONFIRMADO') {
                            <button class="btn btn-ghost btn-xs text-error hover:bg-error/10" (click)="cancelar(turno.idTurno)">
                              Cancelar
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="text-center py-12 text-base-content/60">
                        <div class="flex flex-col items-center gap-3">
                          <app-icon name="calendar" [size]="40" />
                          <div>
                            <p class="font-medium">No hay turnos</p>
                            <p class="text-sm">Creá uno nuevo para empezar</p>
                          </div>
                          <button routerLink="/turnos/nuevo" class="btn btn-primary btn-sm gap-1">
                            <app-icon name="plus" [size]="16" />
                            Nuevo Turno
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      } @else {
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <div class="overflow-x-auto">
              <div class="min-w-[900px]">
                <!-- Header días -->
                <div class="grid grid-cols-[48px_repeat(7,1fr)] gap-1">
                  <div class="p-2"></div>
                  @for (dia of dias(); track dia.key) {
                    <div class="p-2 text-center">
                      <div class="text-sm font-medium text-base-content/70">{{ dia.label }}</div>
                      <div class="text-lg font-bold" [class.text-primary]="esHoy(dia.fecha)">{{ dia.fecha | fechaAr:'diaNumero' }}</div>
                    </div>
                  }
                </div>

                <!-- Área de calendario -->
                <div class="flex h-[720px]">
                  <!-- Columna de horas -->
                  <div class="w-12 shrink-0 relative">
                    @for (slot of slots(); track slot.id) {
                      <div class="absolute w-full text-xs text-base-content/60 text-right pr-2" [style.top.px]="slot.top - 6">
                        {{ slot.label }}
                      </div>
                    }
                  </div>

                  <!-- Columnas de días -->
                  <div class="grid grid-cols-7 gap-1 flex-1 h-full">
                    @for (dia of dias(); track dia.key) {
                      <div
                        class="relative h-full border-l border-base-300 hover:bg-base-200/30 cursor-pointer"
                        (click)="nuevoTurnoClick(dia, $event)"
                      >
                        <!-- Líneas de hora -->
                        @for (slot of slots(); track slot.id) {
                          <div class="absolute w-full border-t border-base-300" [style.top.px]="slot.top"></div>
                        }

                        <!-- Turnos -->
                        @for (item of turnosPorDia()[dia.key]; track item.turno.idTurno) {
                          <div
                            class="absolute rounded-md p-1 text-[10px] shadow-sm border-l-4 cursor-pointer hover:shadow-md hover:ring-1 hover:ring-base-content/20 transition-all overflow-hidden"
                            [style.top.px]="item.top"
                            [style.height.px]="item.height"
                            [style.left.%]="item.left"
                            [style.width.%]="item.width"
                            [class.bg-warning]="item.turno.estado === 'PENDIENTE'"
                            [class.text-warning-content]="item.turno.estado === 'PENDIENTE'"
                            [class.border-warning]="item.turno.estado === 'PENDIENTE'"
                            [class.bg-primary]="item.turno.estado === 'CONFIRMADO'"
                            [class.text-primary-content]="item.turno.estado === 'CONFIRMADO'"
                            [class.border-primary]="item.turno.estado === 'CONFIRMADO'"
                            [class.bg-info]="item.turno.estado === 'EN_PROCESO'"
                            [class.text-info-content]="item.turno.estado === 'EN_PROCESO'"
                            [class.border-info]="item.turno.estado === 'EN_PROCESO'"
                            [class.bg-success]="item.turno.estado === 'COMPLETADO'"
                            [class.text-success-content]="item.turno.estado === 'COMPLETADO'"
                            [class.border-success]="item.turno.estado === 'COMPLETADO'"
                            [class.bg-error]="item.turno.estado === 'CANCELADO' || item.turno.estado === 'NO_SHOW'"
                            [class.text-error-content]="item.turno.estado === 'CANCELADO' || item.turno.estado === 'NO_SHOW'"
                            [class.border-error]="item.turno.estado === 'CANCELADO' || item.turno.estado === 'NO_SHOW'"
                            (click)="verTurno(item.turno.idTurno); $event.stopPropagation()"
                            [title]="item.turno.persona?.nombre + ' ' + item.turno.persona?.apellido + ' - ' + (item.turno.fechaHoraInicio | fechaAr:'hora')"
                          >
                            <div class="font-semibold truncate leading-tight">
                              {{ item.turno.persona?.nombre }} {{ item.turno.persona?.apellido }}
                            </div>
                            <div class="opacity-90 leading-tight">
                              {{ item.turno.fechaHoraInicio | fechaAr:'hora' }} -
                              {{ item.turno.fechaHoraFin | fechaAr:'hora' }}
                            </div>
                            @if (item.height > 30) {
                              <div class="opacity-80 leading-tight truncate">
                                @for (detalle of item.turno.detalles; track detalle.idTurnoDetalle; let last = $last) {
                                  {{ detalle.servicio?.nombre }}{{ last ? '' : ', ' }}
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TurnosComponent implements OnInit {
  private readonly turnosService = inject(TurnosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  turnos = signal<Turno[]>([]);
  vista = signal<'lista' | 'calendario'>('lista');
  fechaSemana = signal(this.inicioSemana(new Date()));

  dias = computed<DiaCalendario[]>(() => {
    const inicio = this.fechaSemana();
    const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = this.addDays(inicio, i);
      return {
        fecha,
        label: nombres[i],
        key: fecha.toISOString().split('T')[0],
      };
    });
  });

  finSemana = computed(() => this.addDays(this.fechaSemana(), 6));

  slots = computed(() => {
    const slots: Array<{ id: string; label: string; top: number; esHora: boolean }> = [];
    for (let h = 9; h <= 18; h++) {
      const top = (h - 9) * 80;
      slots.push({ id: `${h}:00`, label: `${h}:00`, top, esHora: true });
      if (h < 18) {
        slots.push({ id: `${h}:30`, label: `${h}:30`, top: top + 40, esHora: false });
      }
    }
    return slots;
  });

  turnosPorDia = computed<Record<string, TurnoVisual[]>>(() => {
    const inicio = this.fechaSemana();
    const fin = this.addDays(inicio, 7);
    const porDia: Record<string, Turno[]> = {};

    this.turnos()
      .filter((t) => {
        const fecha = new Date(t.fechaHoraInicio);
        return fecha >= inicio && fecha < fin;
      })
      .forEach((turno) => {
        const fecha = new Date(turno.fechaHoraInicio);
        const key = fecha.toISOString().split('T')[0];
        if (!porDia[key]) porDia[key] = [];
        porDia[key].push(turno);
      });

    const result: Record<string, TurnoVisual[]> = {};
    for (const key of Object.keys(porDia)) {
      result[key] = this.asignarVisual(porDia[key]);
    }
    return result;
  });

  private asignarVisual(turnos: Turno[]): TurnoVisual[] {
    const sorted = [...turnos].sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());
    const lanes: Array<{ turno: Turno; lane: number }> = [];
    const laneEnds: number[] = [];

    for (const turno of sorted) {
      const inicio = new Date(turno.fechaHoraInicio).getTime();
      const fin = new Date(turno.fechaHoraFin).getTime();
      let laneIndex = laneEnds.findIndex((end) => end <= inicio);
      if (laneIndex === -1) laneIndex = laneEnds.length;
      laneEnds[laneIndex] = fin;
      lanes.push({ turno, lane: laneIndex });
    }

    const totalLanes = Math.max(1, laneEnds.length);
    const PX_POR_MINUTO = 40 / 30;
    const MINUTOS_APERTURA = 9 * 60;
    const MINUTOS_CIERRE = 18 * 60;
    const ALTURA_TOTAL = (MINUTOS_CIERRE - MINUTOS_APERTURA) * PX_POR_MINUTO;
    const GAP_PX = 2;

    return lanes.map(({ turno, lane }) => {
      const inicio = new Date(turno.fechaHoraInicio);
      const fin = new Date(turno.fechaHoraFin);
      const minutosInicio = inicio.getHours() * 60 + inicio.getMinutes();
      const minutosFin = fin.getHours() * 60 + fin.getMinutes();
      const top = (Math.max(MINUTOS_APERTURA, minutosInicio) - MINUTOS_APERTURA) * PX_POR_MINUTO;
      const bottom = (Math.min(MINUTOS_CIERRE, minutosFin) - MINUTOS_APERTURA) * PX_POR_MINUTO;
      const height = Math.max(bottom - top, 18);
      const anchoPorLane = 100 / totalLanes;
      const left = lane * anchoPorLane;
      const width = anchoPorLane;
      return {
        turno,
        top: top + GAP_PX,
        height: height - GAP_PX * 2,
        left: left + 1,
        width: width - 2,
      };
    });
  }

  nuevoTurnoClick(dia: DiaCalendario, event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const minutos = Math.round((y / 80) * 60) + 9 * 60;
    const minutosRedondeados = Math.round(minutos / 30) * 30;
    const clamped = Math.max(9 * 60, Math.min(18 * 60, minutosRedondeados));
    const hora = Math.floor(clamped / 60);
    const minuto = clamped % 60;
    this.nuevoTurnoSlot(dia.fecha, hora, minuto);
  }

  ngOnInit(): void {
    this.loadTurnos();
  }

  loadTurnos(): void {
    this.turnosService.findAll().subscribe((t) => this.turnos.set(t));
  }

  semanaAnterior(): void {
    this.fechaSemana.set(this.addDays(this.fechaSemana(), -7));
  }

  semanaSiguiente(): void {
    this.fechaSemana.set(this.addDays(this.fechaSemana(), 7));
  }

  hoy(): void {
    this.fechaSemana.set(this.inicioSemana(new Date()));
  }

  nuevoTurnoSlot(fecha: Date, hora: number, minuto: number): void {
    const fechaHora = new Date(fecha);
    fechaHora.setHours(hora, minuto, 0, 0);
    const fechaStr = fechaHora.toISOString().split('T')[0];
    const horaStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
    this.router.navigate(['/turnos/nuevo'], { queryParams: { fecha: fechaStr, hora: horaStr } });
  }

  verTurno(id: number): void {
    // Por ahora navegar al formulario para editar
    this.router.navigate(['/turnos/nuevo'], { queryParams: { id: id.toString() } });
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return (
      fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear()
    );
  }

  private inicioSemana(fecha: Date): Date {
    const result = new Date(fecha);
    const dia = (result.getDay() + 6) % 7;
    result.setDate(result.getDate() - dia);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private addDays(fecha: Date, dias: number): Date {
    const result = new Date(fecha);
    result.setDate(result.getDate() + dias);
    return result;
  }

  confirmar(id: number): void {
    this.turnosService.confirmar(id).subscribe(() => this.loadTurnos());
  }

  cancelar(id: number): void {
    this.turnosService.cancelar(id).subscribe(() => this.loadTurnos());
  }

  iniciar(id: number): void {
    this.turnosService.iniciarAtencion(id).subscribe(() => this.loadTurnos());
  }

  finalizar(id: number): void {
    this.turnosService.finalizar(id).subscribe(() => this.loadTurnos());
  }

  pagar(id: number): void {
    this.turnosService.registrarPago(id).subscribe(() => this.loadTurnos());
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
