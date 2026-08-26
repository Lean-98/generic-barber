import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min, IsDecimal } from 'class-validator';
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

  @ApiProperty({ description: 'Duración en minutos', example: 30 })
  @IsNumber()
  @Min(1)
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
}
