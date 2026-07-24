import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsNotEmpty, IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ServicioReservaDto {
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

export class ReservaPublicaDto {
  @ApiProperty({ description: 'Nombre del cliente', example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Apellido del cliente', example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiProperty({ description: 'Email del cliente', example: 'juan@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '+54 11 1234-5678' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ description: 'Fecha y hora de inicio del turno', example: '2026-06-15T10:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  fechaHoraInicio: string;

  @ApiPropertyOptional({ description: 'Observaciones', example: 'Es mi primera vez' })
  @IsString()
  @IsOptional()
  observacion?: string;

  @ApiProperty({ description: 'Servicios a realizar', type: [ServicioReservaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicioReservaDto)
  servicios: ServicioReservaDto[];
}

export class DisponibilidadQueryDto {
  @ApiProperty({ description: 'Fecha para consultar disponibilidad (YYYY-MM-DD)', example: '2026-06-15' })
  @IsString()
  @IsNotEmpty()
  fecha: string;

  @ApiProperty({ description: 'IDs de servicios separados por coma', example: '1' })
  @IsString()
  @IsNotEmpty()
  servicios: string;
}
