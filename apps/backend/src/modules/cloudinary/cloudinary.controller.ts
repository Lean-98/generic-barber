import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryService } from './cloudinary.service';
import { CLOUDINARY_FOLDERS } from './constants/cloudinary-folders.constant';

/** Límite estricto: es un upload, no una lectura — mismo criterio que
 *  AUTH_THROTTLE en auth.controller.ts (bloqueo largo tras pocos intentos). */
const UPLOAD_THROTTLE = { default: { limit: 3, ttl: 60_000, blockDuration: 1_800_000 } };

@ApiTags('Cloudinary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @Throttle(UPLOAD_THROTTLE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir una imagen a Cloudinary' })
  @ApiResponse({ status: 201, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo o carpeta inválidos' })
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 4 }), // 4mb
          new FileTypeValidator({ fileType: '.(png|jpe?g|avif|webp)$' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('folder') folder: string,
  ) {
    const carpetasValidas: string[] = Object.values(CLOUDINARY_FOLDERS);
    if (!carpetasValidas.includes(folder)) {
      throw new BadRequestException(`Carpeta inválida. Valores permitidos: ${carpetasValidas.join(', ')}`);
    }
    return this.cloudinaryService.uploadFile(file, folder);
  }

  // Declarada antes de ":id" — si no, Nest matchea "by-url" como si fuera
  // el param :id de la ruta de abajo, porque ambas son @Delete.
  @Delete('by-url')
  @ApiOperation({ summary: 'Borrar una imagen a partir de su secure_url de Cloudinary' })
  @ApiResponse({ status: 200, description: 'Borrada (best-effort: no falla si la URL no es de Cloudinary)' })
  async removeByUrl(@Body('url') url: string) {
    if (!url) {
      throw new BadRequestException('url es requerida');
    }
    await this.cloudinaryService.eliminarPorUrl(url);
    return { message: 'ok' };
  }

  // El id es el public_id de Cloudinary devuelto por /upload — puede traer
  // "/" (folder/archivo), así que el cliente tiene que mandarlo con
  // encodeURIComponent() para que llegue entero en :id.
  @Get(':id')
  @ApiOperation({ summary: 'Obtener metadata de una imagen por public_id' })
  async getFile(@Param('id') id: string) {
    const file = await this.cloudinaryService.getFile(id);
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return file;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrar una imagen por public_id' })
  remove(@Param('id') id: string) {
    return this.cloudinaryService.deleteImage(id);
  }
}
