import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateServicioDto } from './create-servicio.dto';
import { UpdateServicioDto } from './update-servicio.dto';

describe('CreateServicioDto - duración', () => {
  async function errorDuracion(clase: any, duracionMinutos: unknown) {
    const dto = plainToInstance(clase, { nombre: 'Corte', precio: 1000, duracionMinutos });
    const errs = await validate(dto as object);
    return errs.find((e) => e.property === 'duracionMinutos');
  }

  it.each([5, 15, 30, 180])('should accept %p minutes', async (min) => {
    expect(await errorDuracion(CreateServicioDto, min)).toBeUndefined();
  });

  it.each([0, 4, 181, 30.5])('should reject %p minutes', async (min) => {
    expect(await errorDuracion(CreateServicioDto, min)).toBeDefined();
  });

  it('should apply the same range when updating', async () => {
    expect(await errorDuracion(UpdateServicioDto, 200)).toBeDefined();
    expect(await errorDuracion(UpdateServicioDto, 45)).toBeUndefined();
  });
});
