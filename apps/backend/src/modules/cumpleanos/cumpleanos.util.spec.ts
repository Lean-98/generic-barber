import { codigoCumple, cumpleEnAnio, envioCorrespondiente, proximoCumple } from './cumpleanos.util';
import { generarTokenBaja, verificarTokenBaja } from './baja-promociones-token.util';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (f: Date) => f.toISOString().slice(0, 10);

describe('cumpleanos.util', () => {
  it('should celebrate 29/02 on 28/02 in non leap years', () => {
    expect(iso(cumpleEnAnio(d('2000-02-29'), 2027))).toBe('2027-02-28');
    expect(iso(cumpleEnAnio(d('2000-02-29'), 2028))).toBe('2028-02-29');
  });

  it('should find the next cumple, today included, crossing the year', () => {
    expect(iso(proximoCumple(d('1990-11-10'), d('2026-11-10')))).toBe('2026-11-10');
    expect(iso(proximoCumple(d('1990-01-02'), d('2026-12-30')))).toBe('2027-01-02');
  });

  describe('envioCorrespondiente (3 días antes, 7 de validez)', () => {
    it('should not send before the aviso day', () => {
      expect(envioCorrespondiente(d('1990-03-15'), d('2026-03-11'), 3, 7)).toBeNull();
    });

    it('should cover the semana del cumple when sent on time', () => {
      const envio = envioCorrespondiente(d('1990-03-15'), d('2026-03-12'), 3, 7)!;
      expect([iso(envio.cumple), iso(envio.desde), iso(envio.hasta)]).toEqual(['2026-03-15', '2026-03-12', '2026-03-18']);
    });

    it('should still send late (until the cumple) keeping the same end', () => {
      const envio = envioCorrespondiente(d('1990-03-15'), d('2026-03-14'), 3, 7)!;
      expect([iso(envio.desde), iso(envio.hasta)]).toEqual(['2026-03-14', '2026-03-18']);
    });

    it('should not send after the cumple (it moves to next year)', () => {
      expect(envioCorrespondiente(d('1990-03-15'), d('2026-03-16'), 3, 7)).toBeNull();
    });

    it('should work across the year end', () => {
      const envio = envioCorrespondiente(d('1990-01-01'), d('2026-12-29'), 3, 7)!;
      expect([iso(envio.cumple), iso(envio.hasta)]).toEqual(['2027-01-01', '2027-01-04']);
    });
  });

  it('should build a valid code from any name', () => {
    expect(codigoCumple('José María', () => 'AB12')).toBe('CUMPLE-JOSEMARIA-AB12');
    expect(codigoCumple('!!', () => 'AB12')).toBe('CUMPLE-AB12AB12');
    expect(codigoCumple('Maximiliano Alejandro', () => 'AB12')).toMatch(/^[A-Z0-9_-]{3,30}$/);
  });

  describe('token de baja', () => {
    it('should verify its own tokens and reject tampered ones', () => {
      const token = generarTokenBaja(42, 'secreto');
      expect(verificarTokenBaja(token, 'secreto')).toBe(42);
      expect(verificarTokenBaja(token.replace(/^42/, '43'), 'secreto')).toBeNull();
      expect(verificarTokenBaja(token, 'otro-secreto')).toBeNull();
      expect(verificarTokenBaja('basura', 'secreto')).toBeNull();
    });
  });
});
