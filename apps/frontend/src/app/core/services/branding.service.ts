import { Injectable, effect, inject, signal } from '@angular/core';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { ConfiguracionNegocio } from '../../shared/models/configuracion.model';
import { hexToOklchTriplet, contentOklchTriplet, isHexColor } from '../../shared/utils/color';

const DEFAULT_BRANDING: ConfiguracionNegocio = {
  nombre: 'Peluquería',
  logoUrl: null,
  iconoUrl: null,
  colorPrimario: null,
  colorSecundario: null,
};

@Injectable({
  providedIn: 'root',
})
export class BrandingService {
  private readonly configuracionService = inject(ConfiguracionService);

  branding = signal<ConfiguracionNegocio>(DEFAULT_BRANDING);

  constructor() {
    this.refresh();
    effect(() => this.aplicarColores(this.branding()));
  }

  refresh(): void {
    this.configuracionService.getBranding().subscribe({
      next: (data) => this.branding.set(data),
      error: () => this.branding.set(DEFAULT_BRANDING),
    });
  }

  private aplicarColores(branding: ConfiguracionNegocio): void {
    if (typeof document === 'undefined') return;
    // ThemeService pone `data-theme` tanto en <html> como en <body>, así que daisyUI
    // define --p/--s directamente sobre ambos elementos. Si solo pisáramos <html>,
    // la declaración propia de <body> (más cercana en la cascada) ganaría por herencia.
    for (const el of [document.documentElement, document.body]) {
      this.aplicarVariable(el.style, '--p', '--pc', branding.colorPrimario);
      this.aplicarVariable(el.style, '--s', '--sc', branding.colorSecundario);
    }
  }

  private aplicarVariable(root: CSSStyleDeclaration, varColor: string, varContenido: string, hex: string | null): void {
    if (isHexColor(hex)) {
      root.setProperty(varColor, hexToOklchTriplet(hex));
      root.setProperty(varContenido, contentOklchTriplet(hex));
    } else {
      root.removeProperty(varColor);
      root.removeProperty(varContenido);
    }
  }
}
