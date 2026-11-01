import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min, Max } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Unidades en stock. null = no se controla stock de este producto', example: 12, nullable: true })
  @IsInt({ message: 'El stock tiene que ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  @Max(100000)
  @IsOptional()
  @Type(() => Number)
  stock?: number | null;

  @ApiPropertyOptional({ description: 'Con cuántas unidades o menos se avisa "stock bajo" en el dashboard', example: 3, nullable: true })
  @IsInt({ message: 'El stock mínimo tiene que ser un número entero' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  @Max(100000)
  @IsOptional()
  @Type(() => Number)
  stockMinimo?: number | null;
}
