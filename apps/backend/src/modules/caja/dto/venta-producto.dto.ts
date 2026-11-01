import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class VentaProductoDto {
  @ApiProperty({ description: 'ID del producto vendido', example: 1 })
  @IsInt()
  @Type(() => Number)
  idProducto: number;

  @ApiProperty({ description: 'Unidades vendidas', example: 2 })
  @IsInt({ message: 'La cantidad tiene que ser un número entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  @Max(999)
  @Type(() => Number)
  cantidad: number;

  @ApiProperty({ description: 'ID de la forma de pago', example: 1 })
  @IsInt()
  @Type(() => Number)
  idFormaPago: number;
}
