import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmarCierreDto {
  @ApiProperty({ description: 'ID del cierre', example: 1 })
  @IsNumber()
  @Type(() => Number)
  idCierre: number;

  @ApiProperty({ description: 'Monto real contado', example: 500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  totalReal: number;

  @ApiPropertyOptional({ description: 'Ignorado: quién cierra se toma del usuario autenticado', example: 'admin' })
  @IsString()
  @IsOptional()
  idUsuario?: string;
}
