import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, IsNotEmpty, IsArray, ValidateNested, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class ServicioTurnoDto {
  @ApiProperty({ description: 'ID del servicio', example: 1 })
  @IsInt()
  @Type(() => Number)
  idServicio: number;

  @ApiPropertyOptional({ description: 'Cantidad (default 1)', example: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cantidad?: number;
}

export class CreateTurnoDto {
  @ApiProperty({ description: 'ID del cliente', example: 1 })
  @IsInt()
  @Type(() => Number)
  idPersona: number;

  @ApiProperty({ description: 'Fecha y hora de inicio', example: '2026-06-15T10:00:00.000Z' })
  @IsDateString()
  fechaHoraInicio: string;

  @ApiPropertyOptional({ description: 'Observaciones', example: 'Cliente prefiere corte clásico' })
  @IsString()
  @IsOptional()
  observacion?: string;

  @ApiProperty({ description: 'Servicios a realizar', type: [ServicioTurnoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ServicioTurnoDto)
  servicios: ServicioTurnoDto[];
}
