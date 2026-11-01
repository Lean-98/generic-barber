import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { normalizarTelefono } from './is-telefono.decorator';
import { CreatePersonaDto } from '../../modules/personas/dto/create-persona.dto';
import { UpdatePersonaDto } from '../../modules/personas/dto/update-persona.dto';
import { ReservaPublicaDto } from '../../modules/turnos/dto/reserva-publica.dto';
import { RegisterDto } from '../../modules/auth/dto/register.dto';

describe('normalizarTelefono', () => {
  it.each([
    ['+54 11 1234-5678', '541112345678'],
    ['0351 339-3667', '3513393667'],
    ['(351) 339 3667', '3513393667'],
    ['3513393667', '3513393667'],
    ['', null],
    ['  - ', null],
    ['351 abc 3667', '351 abc 3667'],
  ])('%p → %p', (entrada, esperado) => {
    expect(normalizarTelefono(entrada)).toBe(esperado);
  });

  it('should leave undefined and null untouched', () => {
    expect(normalizarTelefono(undefined)).toBeUndefined();
    expect(normalizarTelefono(null)).toBeNull();
  });
});

describe('@IsTelefono en los DTOs', () => {
  async function errores(clase: any, plano: Record<string, unknown>) {
    const dto = plainToInstance(clase, plano);
    const errs = await validate(dto as object);
    return { dto: dto as any, telefono: errs.find((e) => e.property === 'telefono') };
  }

  it('should normalize a valid phone when creating a persona', async () => {
    const { dto, telefono } = await errores(CreatePersonaDto, { nombre: 'Juan', apellido: 'Pérez', telefono: '0351 339-3667' });
    expect(telefono).toBeUndefined();
    expect(dto.telefono).toBe('3513393667');
  });

  it.each(['1234567', '1234567890123456', 'sin numeros'])('should reject %p', async (valor) => {
    const { telefono } = await errores(CreatePersonaDto, { nombre: 'Juan', apellido: 'Pérez', telefono: valor });
    expect(telefono?.constraints).toHaveProperty('matches');
  });

  it('should allow omitting the phone', async () => {
    const { telefono } = await errores(CreatePersonaDto, { nombre: 'Juan', apellido: 'Pérez' });
    expect(telefono).toBeUndefined();
  });

  it('should turn an empty phone into null on update, so it can be cleared', async () => {
    const { dto, telefono } = await errores(UpdatePersonaDto, { telefono: '' });
    expect(telefono).toBeUndefined();
    expect(dto.telefono).toBeNull();
  });

  it('should validate the phone in the public booking form', async () => {
    const ok = await errores(ReservaPublicaDto, { telefono: '+54 9 351 339-3667' });
    expect(ok.telefono).toBeUndefined();
    expect(ok.dto.telefono).toBe('5493513393667');

    const mal = await errores(ReservaPublicaDto, { telefono: '123' });
    expect(mal.telefono).toBeDefined();
  });

  it('should validate the phone on register', async () => {
    const { telefono } = await errores(RegisterDto, { telefono: '12' });
    expect(telefono).toBeDefined();
  });
});
