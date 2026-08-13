import { inicioDiaAr, finDiaAr, horaArAUtc, hoyAr } from './fecha-ar.util';

describe('fecha-ar.util', () => {
  describe('inicioDiaAr / finDiaAr', () => {
    it('should compute the AR day window for a calendar-date input', () => {
      // '2026-06-15' parseado como fecha (medianoche UTC), no como instante en vivo.
      const fecha = new Date('2026-06-15');

      expect(inicioDiaAr(fecha).toISOString()).toBe('2026-06-15T03:00:00.000Z');
      expect(finDiaAr(fecha).toISOString()).toBe('2026-06-16T02:59:59.999Z');
    });
  });

  describe('horaArAUtc', () => {
    it('should convert a local AR hour on a calendar date to its UTC instant', () => {
      const fecha = new Date('2026-06-15T00:00:00.000Z');

      expect(horaArAUtc(fecha, 9).toISOString()).toBe('2026-06-15T12:00:00.000Z');
      expect(horaArAUtc(fecha, 18).toISOString()).toBe('2026-06-15T21:00:00.000Z');
    });
  });

  describe('hoyAr', () => {
    it('should return the AR calendar date for a daytime instant', () => {
      // 2026-06-15T15:00:00Z = 2026-06-15T12:00:00 hora Argentina
      jest.useFakeTimers().setSystemTime(new Date('2026-06-15T15:00:00Z'));

      expect(hoyAr().toISOString()).toBe('2026-06-15T00:00:00.000Z');

      jest.useRealTimers();
    });

    it('should use the Argentina calendar date, not the UTC one, when they differ', () => {
      // 2026-08-13T01:39:33Z ya es "13 de agosto" en UTC, pero en Argentina
      // (UTC-3) todavía son las 22:39 del 12 de agosto: "hoy" debe ser el 12.
      jest.useFakeTimers().setSystemTime(new Date('2026-08-13T01:39:33Z'));

      const hoy = hoyAr();
      expect(hoy.toISOString()).toBe('2026-08-12T00:00:00.000Z');

      // El instante real debe caer dentro de la ventana [inicio, fin] de ese día.
      const ahora = new Date();
      expect(ahora.getTime()).toBeGreaterThanOrEqual(inicioDiaAr(hoy).getTime());
      expect(ahora.getTime()).toBeLessThanOrEqual(finDiaAr(hoy).getTime());

      jest.useRealTimers();
    });

    it('should treat an instant right at AR midnight as the start of that same day', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-15T03:00:00.000Z')); // exactamente 00:00 AR

      expect(hoyAr().toISOString()).toBe('2026-06-15T00:00:00.000Z');

      jest.useRealTimers();
    });
  });
});
