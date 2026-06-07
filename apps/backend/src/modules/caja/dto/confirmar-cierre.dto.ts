import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmarCierreDto {
  @ApiProperty({ description: 'ID del cierre', example: 1 })
  @IsNumber()
  @Type(() => Number)
  idCierre: number;

  @ApiProperty({ description: 'Monto real contado', example: 500.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  totalReal: number;

  @ApiProperty({ description: 'Usuario que cierra', example: 'admin' })
  @IsString()
  idUsuario: string;
}
