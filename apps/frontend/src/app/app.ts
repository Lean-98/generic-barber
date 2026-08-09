import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './shared/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { BrandingService } from './core/services/branding.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly brandingService = inject(BrandingService);

  ngOnInit(): void {
    this.authService.loadUser();
  }
}
