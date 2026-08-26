import { Component, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CloudinaryService } from '../services/cloudinary.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="space-y-1.5">
      <div class="flex items-center gap-3">
        @if (url()) {
          <img [src]="url()" alt="" class="h-16 w-16 shrink-0 rounded-lg border border-base-300 object-cover" />
        } @else {
          <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-base-300 text-base-content/30">
            <app-icon name="image" [size]="22" />
          </div>
        }
        <div class="min-w-0 flex-1 space-y-1.5">
          <input
            type="text"
            class="input input-bordered input-sm w-full"
            [ngModel]="url() ?? ''"
            (ngModelChange)="url.set($event)"
            placeholder="https://... (o subí una imagen)"
          />
          <label class="btn btn-ghost btn-xs gap-1.5" [class.btn-disabled]="subiendo()">
            @if (subiendo()) {
              <app-icon name="loader" [size]="14" className="animate-spin" />
              Subiendo...
            } @else {
              <app-icon name="image" [size]="14" />
              Subir imagen
            }
            <input
              type="file"
              class="hidden"
              accept="image/png,image/jpeg,image/webp,image/avif"
              [disabled]="subiendo()"
              (change)="onFileSelected($event)"
            />
          </label>
        </div>
      </div>
      @if (error()) {
        <p class="text-xs text-error">{{ error() }}</p>
      }
    </div>
  `,
})
export class ImageUploadComponent {
  private readonly cloudinaryService = inject(CloudinaryService);

  folder = input.required<string>();
  url = model<string | undefined>('');

  subiendo = signal(false);
  error = signal('');

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const urlAnterior = this.url();

    this.error.set('');
    this.subiendo.set(true);
    this.cloudinaryService.upload(file, this.folder()).subscribe({
      next: (res) => {
        this.subiendo.set(false);
        this.url.set(res.secure_url);
        // Reemplazo silencioso: si había una imagen previa, se borra de Cloudinary
        // para no dejarla huérfana. Best-effort — un fallo acá no debe afectar al usuario.
        if (urlAnterior) {
          this.cloudinaryService.deleteByUrl(urlAnterior).subscribe({ error: () => {} });
        }
      },
      error: (err) => {
        this.subiendo.set(false);
        this.error.set(err?.error?.message || 'No se pudo subir la imagen');
      },
    });
  }
}
