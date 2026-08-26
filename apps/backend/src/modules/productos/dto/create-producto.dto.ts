import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductoDto {
  @ApiProperty({ description: 'Nombre del producto', example: 'Cera moldeadora' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción del producto', example: 'Fijación fuerte, terminación mate' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ description: 'Precio del producto', example: 4500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precio: number;

  @ApiPropertyOptional({ description: 'URL de la imagen del producto', example: 'https://example.com/cera.jpg' })
  @IsString()
  @IsOptional()
  urlImagen?: string;

  @ApiPropertyOptional({ description: 'ID de la categoría del producto', example: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  idCategoria?: number;

  @ApiPropertyOptional({ description: 'Indica si el producto está vigente', example: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  vigente?: boolean;
}
