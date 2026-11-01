import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min, IsDecimal, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServicioDto {
  @ApiProperty({ description: 'Nombre del servicio', example: 'Corte de cabello' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción del servicio', example: 'Corte clásico para caballero' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'ID de la categoría del servicio', example: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  idCategoria?: number;

  @ApiProperty({ description: 'Precio del servicio', example: 25.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precio: number;

  @ApiProperty({ description: 'Duración en minutos (entre 5 y 180)', example: 30 })
  @IsInt({ message: 'La duración tiene que ser un número entero de minutos' })
  @Min(5, { message: 'La duración mínima de un servicio es de 5 minutos' })
  @Max(180, { message: 'La duración máxima de un servicio es de 180 minutos' })
  @Type(() => Number)
  duracionMinutos: number;

  @ApiPropertyOptional({ description: 'URL de la imagen del servicio', example: 'https://example.com/corte.jpg' })
  @IsString()
  @IsOptional()
  urlImagen?: string;

  @ApiPropertyOptional({ description: 'Indica si el servicio está vigente', example: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  vigente?: boolean;

  @ApiPropertyOptional({ description: 'Si las visitas de este servicio cuentan para el programa de fidelización', example: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  cuentaParaFidelizacion?: boolean;

  @ApiPropertyOptional({ description: 'Costo estimado de insumos por servicio (para el reporte de rentabilidad)', example: 800 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El costo de insumos no puede ser negativo' })
  @IsOptional()
  @Type(() => Number)
  costoInsumos?: number;
}
