import { Component, Input, computed, inject } from '@angular/core';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-brand-mark',
  standalone: true,
  template: `
    @if (imagen(); as url) {
      @if (hero) {
        <img [src]="url" [alt]="nombre()" class="w-auto shrink-0 object-contain" [class]="barHeight" />
      } @else {
        <img [src]="url" [alt]="nombre()" class="shrink-0 rounded-sm object-cover" [class]="barHeight + ' ' + barHeight.replace('h-', 'w-')" />
      }
    } @else {
      <span class="stripe-accent w-1.5 shrink-0 rounded-sm" [class]="barHeight"></span>
    }
    @if (showName) {
      <span class="font-display font-semibold" [class]="nameClass + ' ' + textSize">{{ nombre() }}</span>
    }
  `,
  // El host es un custom element (display: inline por defecto) y el reset de
  // Tailwind pone `img { display: block }`, así que sin esto la imagen rompe
  // el flujo y el nombre queda apilado debajo en vez de al lado. `contents`
  // saca al host del box model: img y span pasan a ser hijos flex directos
  // del contenedor que use este componente (ej. `flex items-center gap-3`).
  styles: [':host { display: contents; }'],
})
export class BrandMarkComponent {
  private readonly brandingService = inject(BrandingService);

  @Input() barHeight = 'h-7';
  @Input() textSize = 'text-lg';
  @Input() nameClass = 'truncate';
  @Input() showName = true;
  /** Marca "hero": muestra el logo completo, en su proporción real, sin recortarlo a un cuadrado. */
  @Input() hero = false;

  private readonly branding = this.brandingService.branding;
  nombre = computed(() => this.branding().nombre);
  // El logo es la marca principal; el ícono es el sustituto compacto cuando no hay logo cargado.
  imagen = computed(() => this.branding().logoUrl || this.branding().iconoUrl);
}
