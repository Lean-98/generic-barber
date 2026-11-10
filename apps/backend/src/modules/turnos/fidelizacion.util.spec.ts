import { progresoDeCliente, progresoDeTurno, reglaFidelizacion } from './fidelizacion.util';

const CONFIG = {
  fidelizacionActiva: true,
  fidelizacionVisitasRequeridas: 5,
  fidelizacionDescuentoPorcentaje: '50',
  fidelizacionFechaInicio: null,
};

/** count() devuelve primero las visitas completadas y después las pendientes. */
function db(completadas: number, pendientes: number) {
  const count = jest.fn().mockResolvedValueOnce(completadas).mockResolvedValueOnce(pendientes);
  return { db: { turnoDetalle: { count } } as any, count };
}

const turno = (extra: Partial<Parameters<typeof progresoDeTurno>[2]> = {}) => ({
  idTurno: 9,
  idPersona: 1,
  fechaHoraInicio: new Date('2026-12-01T13:00:00.000Z'),
  aplicaDescuentoPersonal: false,
  serviciosQueSuman: 1,
  ...extra,
});

describe('fidelizacion.util', () => {
  describe('reglaFidelizacion', () => {
    it('should be null when the programa is off or incomplete', () => {
      expect(reglaFidelizacion(null)).toBeNull();
      expect(reglaFidelizacion({ ...CONFIG, fidelizacionActiva: false })).toBeNull();
      expect(reglaFidelizacion({ ...CONFIG, fidelizacionVisitasRequeridas: null })).toBeNull();
    });
  });

  describe('progresoDeTurno', () => {
    it('should give the descuento to the visita number N', async () => {
      const { db: d } = db(4, 0);
      await expect(progresoDeTurno(d, CONFIG, turno())).resolves.toEqual({
        visitasRequeridas: 5,
        descuentoPorcentaje: 50,
        visitaEnCiclo: 5,
        conDescuento: true,
        cuentaTurnosPendientes: false,
      });
    });

    it('should count turnos already booked before this one', async () => {
      const { db: d, count } = db(1, 2);
      const progreso = await progresoDeTurno(d, CONFIG, turno());

      expect(progreso).toMatchObject({ visitaEnCiclo: 4, conDescuento: false, cuentaTurnosPendientes: true });
      // Las pendientes: solo las de antes de este turno y sin contarlo a él.
      expect(count.mock.calls[1][0].where.turno).toMatchObject({
        fechaHoraInicio: { lt: new Date('2026-12-01T13:00:00.000Z') },
        idTurno: { not: 9 },
      });
    });

    it('should start a new ciclo after the descuento', async () => {
      const { db: d } = db(5, 0);
      await expect(progresoDeTurno(d, CONFIG, turno())).resolves.toMatchObject({ visitaEnCiclo: 1, conDescuento: false });
    });

    it('should detect the descuento on any of several servicios that suman', async () => {
      const { db: d } = db(3, 0);
      // Visitas 4 y 5 en el mismo turno: la 5 tiene descuento.
      await expect(progresoDeTurno(d, CONFIG, turno({ serviciosQueSuman: 2 }))).resolves.toMatchObject({ conDescuento: true });
    });

    it('should be null for empleados, servicios that do not suman, or the programa off', async () => {
      expect(await progresoDeTurno(db(4, 0).db, CONFIG, turno({ aplicaDescuentoPersonal: true }))).toBeNull();
      expect(await progresoDeTurno(db(4, 0).db, CONFIG, turno({ serviciosQueSuman: 0 }))).toBeNull();
      expect(await progresoDeTurno(db(4, 0).db, { ...CONFIG, fidelizacionActiva: false }, turno())).toBeNull();
    });
  });

  describe('progresoDeCliente', () => {
    it('should count done and booked visitas and say if the next one has the descuento', async () => {
      await expect(progresoDeCliente(db(2, 2).db, CONFIG, { idPersona: 1, aplicaDescuentoPersonal: false })).resolves.toEqual({
        visitasRequeridas: 5,
        descuentoPorcentaje: 50,
        visitasEnCiclo: 4,
        proximaConDescuento: true,
      });
      await expect(progresoDeCliente(db(5, 0).db, CONFIG, { idPersona: 1, aplicaDescuentoPersonal: false })).resolves.toMatchObject({
        visitasEnCiclo: 0,
        proximaConDescuento: false,
      });
    });
  });
});
