import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoriaServicioDto {
  @ApiProperty({ description: 'Nombre de la categoría', example: 'Corte' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Indica si la categoría está vigente', example: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  vigente?: boolean;
}
