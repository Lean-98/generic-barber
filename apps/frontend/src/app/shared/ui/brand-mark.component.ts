import { Component, Input, computed, inject } from '@angular/core';
import { BrandingService } from '../../core/services/branding.service';

@Component({
  selector: 'app-brand-mark',
  standalone: true,
  template: `
    @if (icono(); as url) {
      <img [src]="url" [alt]="nombre()" class="shrink-0 rounded-sm object-cover" [class]="barHeight + ' ' + barHeight.replace('h-', 'w-')" />
    } @else {
      <span class="stripe-accent w-1.5 shrink-0 rounded-sm" [class]="barHeight"></span>
    }
    @if (showName) {
      <span class="font-display truncate font-semibold" [class]="textSize">{{ nombre() }}</span>
    }
  `,
})
export class BrandMarkComponent {
  private readonly brandingService = inject(BrandingService);

  @Input() barHeight = 'h-7';
  @Input() textSize = 'text-lg';
  @Input() showName = true;

  private readonly branding = this.brandingService.branding;
  nombre = computed(() => this.branding().nombre);
  icono = computed(() => this.branding().iconoUrl || this.branding().logoUrl);
}
