import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReservasPublicasService, TurnoParaCancelar } from '../../shared/services/reservas-publicas.service';
import { BrandingService } from '../../core/services/branding.service';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { FechaArPipe } from '../../shared/pipes/fecha-ar.pipe';

type Vista = 'cargando' | 'invalido' | 'confirmar' | 'cancelado' | 'yaCancelado' | 'noCancelable';

/**
 * Página pública a la que lleva el botón "Cancelar turno" de los mails.
 * El cliente puede cancelar siempre que el turno no haya empezado: el
 * horario queda libre y al barbero le llega un aviso (ver turnos.service.ts).
 */
@Component({
  selector: 'app-cancelar-turno',
  standalone: true,
  imports: [RouterLink, BrandMarkComponent, IconComponent, FechaArPipe],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-base-200 p-6">
      <div class="w-full max-w-md">
        <div class="mb-6 flex justify-center">
          <app-brand-mark [hero]="true" barHeight="h-10" />
        </div>

        <div class="card bg-base-100 shadow-sm">
          <div class="card-body gap-4">
            @switch (vista()) {
              @case ('cargando') {
                <div class="flex justify-center py-8 text-base-content/50">
                  <app-icon name="loader" [size]="24" className="animate-spin" />
                </div>
              }

              @case ('invalido') {
                <h1 class="font-display text-2xl font-medium">Link inválido</h1>
                <p class="text-sm text-base-content/70">
                  No encontramos el turno de este link. Revisá que lo hayas copiado completo o escribinos.
                </p>
              }

              @case ('confirmar') {
                <h1 class="font-display text-2xl font-medium">¿Cancelar tu turno?</h1>
                <p class="text-sm text-base-content/70">
                  Hola {{ turno()?.nombreCliente }}, si no vas a poder venir cancelalo acá y liberamos el horario para otra persona.
                </p>
                <div class="rounded-lg border border-base-300 p-4 text-sm">
                  <div class="flex items-center gap-2 font-medium capitalize">
                    <app-icon name="calendar" [size]="16" />
                    {{ turno()?.fechaHoraInicio | fechaAr: 'completa' }}
                  </div>
                  <div class="mt-1 flex items-center gap-2 text-base-content/70">
                    <app-icon name="clock" [size]="16" />
                    {{ turno()?.fechaHoraInicio | fechaAr: 'hora' }} h
                  </div>
                  <div class="mt-1 flex items-center gap-2 text-base-content/70">
                    <app-icon name="scissors" [size]="16" />
                    {{ turno()?.servicios?.join(', ') }}
                  </div>
                </div>

                @if (error()) {
                  <div class="alert alert-error py-2.5 text-sm">
                    <app-icon name="alert-circle" [size]="18" />
                    <span>{{ error() }}</span>
                  </div>
                }

                <button type="button" class="btn btn-error w-full" [disabled]="enviando()" (click)="cancelar()">
                  @if (enviando()) {
                    <app-icon name="loader" [size]="18" className="animate-spin" />
                  }
                  {{ enviando() ? 'Cancelando…' : 'Sí, cancelar turno' }}
                </button>
                <a routerLink="/" class="btn btn-ghost w-full">No, mantener mi turno</a>
              }

              @case ('cancelado') {
                <div class="flex justify-center text-success">
                  <app-icon name="check-circle" [size]="40" />
                </div>
                <h1 class="text-center font-display text-2xl font-medium">Turno cancelado</h1>
                <p class="text-center text-sm text-base-content/70">
                  Gracias por avisar. Ya le avisamos a la barbería y el horario quedó libre.
                </p>
                <a routerLink="/reservar" class="btn btn-primary w-full">Reservar otro turno</a>
              }

              @case ('yaCancelado') {
                <h1 class="font-display text-2xl font-medium">Este turno ya está cancelado</h1>
                <p class="text-sm text-base-content/70">No tenés que hacer nada más.</p>
                <a routerLink="/reservar" class="btn btn-primary w-full">Reservar otro turno</a>
              }

              @case ('noCancelable') {
                <h1 class="font-display text-2xl font-medium">Este turno ya no se puede cancelar</h1>
                <p class="text-sm text-base-content/70">
                  El turno ya empezó o ya fue atendido. Si necesitás algo, escribinos.
                </p>
              }
            }

            @if (whatsappUrl() && (vista() === 'invalido' || vista() === 'noCancelable' || vista() === 'confirmar')) {
              <a [href]="whatsappUrl()" target="_blank" rel="noopener" class="btn btn-outline btn-sm gap-2 self-center">
                <app-icon name="whatsapp" [size]="16" />
                {{ vista() === 'confirmar' ? '¿Preferís cambiar el horario? Escribinos' : 'Escribinos por WhatsApp' }}
              </a>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CancelarTurnoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reservasService = inject(ReservasPublicasService);
  private readonly brandingService = inject(BrandingService);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  vista = signal<Vista>('cargando');
  turno = signal<TurnoParaCancelar | null>(null);
  enviando = signal(false);
  error = signal('');
  whatsappUrl = () => this.brandingService.branding().whatsappUrl;

  ngOnInit(): void {
    if (!this.token) {
      this.vista.set('invalido');
      return;
    }
    this.reservasService.getTurnoParaCancelar(this.token).subscribe({
      next: (turno) => {
        this.turno.set(turno);
        this.vista.set(this.vistaPara(turno));
      },
      error: () => this.vista.set('invalido'),
    });
  }

  cancelar(): void {
    this.enviando.set(true);
    this.error.set('');
    this.reservasService.cancelarTurno(this.token).subscribe({
      next: (turno) => {
        this.enviando.set(false);
        this.turno.set(turno);
        this.vista.set('cancelado');
      },
      error: (err) => {
        this.enviando.set(false);
        this.error.set(err?.error?.message || 'No pudimos cancelar el turno. Probá de nuevo o escribinos.');
      },
    });
  }

  private vistaPara(turno: TurnoParaCancelar): Vista {
    if (turno.estado === 'CANCELADO') return 'yaCancelado';
    return turno.puedeCancelar ? 'confirmar' : 'noCancelable';
  }
}
