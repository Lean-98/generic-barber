import { ServiciosController } from './servicios.controller';
import { ServiciosService } from './servicios.service';

/** El costo de insumos es interno: la landing (sin sesión) no lo tiene que ver. */
describe('ServiciosController - costo interno', () => {
  const servicio = { idServicio: 1, nombre: 'Corte', precio: 13000, costoInsumos: 900 };
  const service = {
    findAll: jest.fn().mockResolvedValue({ data: [servicio], total: 1, page: 1, limit: 20, totalPages: 1 }),
    findOne: jest.fn().mockResolvedValue(servicio),
  } as unknown as ServiciosService;
  const controller = new ServiciosController(service);

  it('hides costoInsumos from anonymous requests', async () => {
    const lista = await controller.findAll({} as any, undefined);
    const uno = await controller.findOne(1, undefined);

    expect(lista.data[0]).not.toHaveProperty('costoInsumos');
    expect(uno).not.toHaveProperty('costoInsumos');
    expect(uno).toEqual(expect.objectContaining({ nombre: 'Corte', precio: 13000 }));
  });

  it('includes costoInsumos for the logged-in panel', async () => {
    const lista = await controller.findAll({} as any, { usuario: 'admin' });
    const uno = await controller.findOne(1, { usuario: 'admin' });

    expect(lista.data[0]).toHaveProperty('costoInsumos', 900);
    expect(uno).toHaveProperty('costoInsumos', 900);
  });
});
