import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CostosNegocioDto {
  @ApiProperty({ description: 'Gastos fijos del mes: alquiler, servicios, impuestos, sueldos fijos', example: 500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Los costos fijos no pueden ser negativos' })
  @Max(9_999_999_999)
  @Type(() => Number)
  costosFijosMensuales: number;

  @ApiProperty({ description: 'Costo de una hora de trabajo (lo que se le paga al barbero por hora). 0 si no aplica', example: 10000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El costo por hora no puede ser negativo' })
  @Max(99_999_999)
  @Type(() => Number)
  costoHoraTrabajo: number;
}

export class ClientesInactivosQueryDto {
  @ApiProperty({ description: 'Días sin venir para considerar inactivo a un cliente', example: 60, required: false })
  @Type(() => Number)
  @Min(7, { message: 'El mínimo es 7 días' })
  @Max(730, { message: 'El máximo es 730 días' })
  dias: number = 60;
}
