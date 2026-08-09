const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && HEX_COLOR_REGEX.test(value);
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convierte un color hex (#rrggbb) al triplete OKLCH "L% C H" que usa daisyUI v4
 * en sus variables de tema (--p, --s, etc). Mismo algoritmo que usa daisyUI
 * internamente para generar temas a partir de colores hex.
 */
export function hexToOklchTriplet(hex: string): string {
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + bLab * bLab);
  let H = (Math.atan2(bLab, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return `${(L * 100).toFixed(4)}% ${C.toFixed(6)} ${H.toFixed(6)}`;
}

/** Devuelve un triplete OKLCH casi blanco o casi negro, el que mejor contraste haga sobre el color dado. */
export function contentOklchTriplet(hex: string): string {
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255);
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminancia > 0.4 ? '9% 0 0' : '98% 0 0';
}
