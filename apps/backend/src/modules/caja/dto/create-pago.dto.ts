import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsInt, IsOptional, IsString, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePagoDto {
  @ApiProperty({ description: 'ID del turno', example: 1 })
  @IsInt()
  @Type(() => Number)
  idTurno: number;

  @ApiProperty({ description: 'ID de la forma de pago', example: 1 })
  @IsInt()
  @Type(() => Number)
  idFormaPago: number;

  @ApiProperty({ description: 'Monto del pago', example: 25.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  monto: number;

  @ApiPropertyOptional({ description: 'Número de comprobante', example: 'ABC123' })
  @IsString()
  @IsOptional()
  comprobante?: string;
}
