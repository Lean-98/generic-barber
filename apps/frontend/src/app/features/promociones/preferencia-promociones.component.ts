import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CumpleanosService, PreferenciaPromociones } from '../../shared/services/cumpleanos.service';
import { BrandMarkComponent } from '../../shared/ui/brand-mark.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { mensajeDeErrorHttp } from '../../shared/utils/error-http.util';

/**
 * Página pública del link "Darme de baja" de los mails de promociones (ej.
 * el cupón de cumpleaños). El link va firmado (ver baja-promociones-token
 * en el backend), así que no hace falta iniciar sesión.
 */
@Component({
  selector: 'app-preferencia-promociones',
  standalone: true,
  imports: [RouterLink, BrandMarkComponent, IconComponent],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-base-200 p-6">
      <div class="w-full max-w-md">
        <div class="mb-6 flex justify-center">
          <app-brand-mark [hero]="true" barHeight="h-10" />
        </div>

        <div class="card bg-base-100 shadow-sm">
          <div class="card-body gap-4">
            @if (cargando()) {
              <div class="flex justify-center py-8 text-base-content/50">
                <app-icon name="loader" [size]="24" className="animate-spin" />
              </div>
            } @else if (invalido()) {
              <h1 class="font-display text-2xl font-medium">Link inválido</h1>
              <p class="text-sm text-base-content/70">Revisá que lo hayas copiado completo desde el mail, o escribinos.</p>
            } @else if (preferencia(); as p) {
              @if (p.recibePromociones) {
                <h1 class="font-display text-2xl font-medium">¿Dejar de recibir promociones?</h1>
                <p class="text-sm text-base-content/70">
                  Hola {{ p.nombre }}. Si te das de baja, no te vamos a mandar más beneficios ni promociones por email, como el
                  regalo de cumpleaños. Los mails de tus turnos (confirmación y recordatorio) siguen llegando.
                </p>
                <button class="btn btn-error" [disabled]="guardando()" (click)="cambiar(false)">
                  {{ guardando() ? 'Guardando...' : 'Darme de baja' }}
                </button>
              } @else {
                <h1 class="font-display text-2xl font-medium">Listo, te diste de baja</h1>
                <p class="text-sm text-base-content/70">
                  {{ p.nombre }}, no vas a recibir más promociones por email. Si cambiás de idea, podés volver a activarlas.
                </p>
                <button class="btn btn-outline" [disabled]="guardando()" (click)="cambiar(true)">
                  {{ guardando() ? 'Guardando...' : 'Quiero volver a recibirlas' }}
                </button>
              }
              @if (error()) {
                <div class="alert alert-error text-sm"><app-icon name="alert-circle" [size]="16" /><span>{{ error() }}</span></div>
              }
            }
            <a routerLink="/" class="btn btn-ghost btn-sm">Ir al inicio</a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PreferenciaPromocionesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cumpleanosService = inject(CumpleanosService);

  private token = '';
  cargando = signal(true);
  invalido = signal(false);
  guardando = signal(false);
  error = signal('');
  preferencia = signal<PreferenciaPromociones | null>(null);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.cargando.set(false);
      this.invalido.set(true);
      return;
    }
    this.cumpleanosService.getPreferencia(this.token).subscribe({
      next: (p) => {
        this.preferencia.set(p);
        this.cargando.set(false);
      },
      error: () => {
        this.invalido.set(true);
        this.cargando.set(false);
      },
    });
  }

  cambiar(recibePromociones: boolean): void {
    this.guardando.set(true);
    this.error.set('');
    this.cumpleanosService.setPreferencia(this.token, recibePromociones).subscribe({
      next: (p) => {
        this.preferencia.set(p);
        this.guardando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeDeErrorHttp(err, 'No se pudo guardar. Probá de nuevo.'));
        this.guardando.set(false);
      },
    });
  }
}
