import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

jest.mock('cloudinary', () => ({
  v2: {
    uploader: { upload_stream: jest.fn(), destroy: jest.fn() },
    api: { resource: jest.fn() },
  },
}));

jest.mock('streamifier', () => ({
  createReadStream: jest.fn(() => ({ pipe: jest.fn() })),
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(() => {
    service = new CloudinaryService();
    jest.clearAllMocks();
  });

  it('uploadFile: sube el archivo a la carpeta indicada', async () => {
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (options: any, callback: any) => {
        callback(null, { public_id: `${options.folder}/abc123` });
        return {};
      },
    );

    const file = { buffer: Buffer.from('img') } as Express.Multer.File;
    const resultado = await service.uploadFile(file, 'productos');

    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      { folder: 'productos' },
      expect.any(Function),
    );
    expect((resultado as any).public_id).toBe('productos/abc123');
  });

  it('uploadFile: propaga el error de Cloudinary si el upload falla', async () => {
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (_options: any, callback: any) => {
        callback(new Error('cloudinary caído'), null);
        return {};
      },
    );

    const file = { buffer: Buffer.from('img') } as Express.Multer.File;
    await expect(service.uploadFile(file, 'productos')).rejects.toThrow('cloudinary caído');
  });

  it('getFile: devuelve el recurso cuando Cloudinary lo encuentra', async () => {
    (cloudinary.api.resource as jest.Mock).mockResolvedValue({ public_id: 'productos/xyz' });

    const resultado = await service.getFile('productos/xyz');

    expect(cloudinary.api.resource).toHaveBeenCalledWith('productos/xyz');
    expect(resultado).toEqual({ public_id: 'productos/xyz' });
  });

  it('getFile: devuelve null si Cloudinary no encuentra el recurso', async () => {
    (cloudinary.api.resource as jest.Mock).mockRejectedValue(new Error('not found'));

    const resultado = await service.getFile('productos/xyz');

    expect(resultado).toBeNull();
  });

  it('deleteImage: borra el recurso por public_id', async () => {
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    const resultado = await service.deleteImage('productos/xyz');

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('productos/xyz');
    expect(resultado).toEqual({ result: 'ok' });
  });

  describe('eliminarPorUrl', () => {
    it('borra el archivo cuando la URL es de Cloudinary', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

      await service.eliminarPorUrl('https://res.cloudinary.com/demo/image/upload/v1699999999/productos/abc123.jpg');

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('productos/abc123');
    });

    it('no hace nada si la URL no tiene forma de Cloudinary', async () => {
      await service.eliminarPorUrl('https://example.com/foto.jpg');

      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('no propaga el error si Cloudinary falla al borrar', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(
        service.eliminarPorUrl('https://res.cloudinary.com/demo/image/upload/v1699999999/productos/abc123.jpg'),
      ).resolves.toBeUndefined();
    });

    it('extrae el public_id incluyendo la subcarpeta', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

      await service.eliminarPorUrl('https://res.cloudinary.com/demo/image/upload/v1699999999/marca/logo-xyz.png');

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('marca/logo-xyz');
    });
  });
});
