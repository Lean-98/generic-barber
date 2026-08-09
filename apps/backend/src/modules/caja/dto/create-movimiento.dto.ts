import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsInt, IsString, IsEnum, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { MovimientoTipo } from '../../../common/enums/movimiento-tipo.enum';

export class CreateMovimientoDto {
  @ApiProperty({ enum: MovimientoTipo, description: 'Tipo de movimiento', example: 'INGRESO' })
  @IsEnum(MovimientoTipo)
  @IsString()
  tipo: MovimientoTipo;

  @ApiProperty({ description: 'Monto', example: 25.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  monto: number;

  @ApiProperty({ description: 'Concepto', example: 'Pago turno #1' })
  @IsString()
  concepto: string;

  @ApiProperty({ description: 'ID de la forma de pago', example: 1 })
  @IsInt()
  @Type(() => Number)
  idFormaPago: number;

  @ApiPropertyOptional({ description: 'ID del usuario (se toma del token si no se envía)', example: 'admin' })
  @IsString()
  @IsOptional()
  idUsuario?: string;

  @ApiPropertyOptional({ description: 'ID del turno (opcional para egresos)', example: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  idTurno?: number;
}
