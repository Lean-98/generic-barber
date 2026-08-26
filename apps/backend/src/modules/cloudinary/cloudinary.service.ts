import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, DeleteApiResponse, type UploadApiResponse } from 'cloudinary';
// streamifier no trae tipos propios.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const streamifier = require('streamifier');
import { CloudinaryResponse } from './types/cloudinary-response.type';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  uploadFile(file: Express.Multer.File, folder: string): Promise<CloudinaryResponse> {
    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('No result from Cloudinary'));
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async getFile(publicId: string): Promise<UploadApiResponse | null> {
    try {
      return await cloudinary.api.resource(publicId);
    } catch {
      return null;
    }
  }

  async deleteImage(publicId: string): Promise<DeleteApiResponse> {
    return cloudinary.uploader.destroy(publicId);
  }

  /**
   * Borra el archivo detrás de una `secure_url` de Cloudinary — pensado
   * para cuando otro módulo reemplaza una URL guardada (ej. Producto.urlImagen)
   * y no quiere dejar el archivo anterior huérfano. Best-effort a propósito:
   * si la URL no es de Cloudinary, no se puede parsear, o el borrado falla,
   * NO tira la excepción — quien llama no debería fallar su propia operación
   * porque la limpieza de un archivo secundario no salió perfecta.
   */
  async eliminarPorUrl(url: string): Promise<void> {
    const publicId = this.extraerPublicId(url);
    if (!publicId) return;
    try {
      await this.deleteImage(publicId);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudo borrar ${publicId} de Cloudinary (queda huérfano): ${mensaje}`);
    }
  }

  /** De ".../upload/v169.../carpeta/archivo.png" extrae "carpeta/archivo"
   *  — null si `url` no tiene esa forma (ej. una imagen pegada a mano con
   *  otra URL externa, no subida por este módulo). */
  private extraerPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return match ? match[1] : null;
  }
}
