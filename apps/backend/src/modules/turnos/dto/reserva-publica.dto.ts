import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsNotEmpty, IsArray, IsInt, IsDateString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsTelefono } from '../../../common/decorators/is-telefono.decorator';

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
  @ApiPropertyOptional({ description: 'Nombre del cliente (requerido solo si el email no pertenece a un cliente existente)', example: 'Juan' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Apellido del cliente (requerido solo si el email no pertenece a un cliente existente)', example: 'Pérez' })
  @IsString()
  @IsOptional()
  apellido?: string;

  @ApiProperty({ description: 'Email del cliente', example: 'juan@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '3511234567' })
  // Se guarda solo con dígitos (ver IsTelefono)
  @IsTelefono()
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Fecha de cumpleaños (AAAA-MM-DD), para el beneficio de cumpleaños. Solo se guarda si el cliente todavía no tenía una cargada.',
    example: '1995-03-12',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha de cumpleaños tiene que tener el formato AAAA-MM-DD' })
  fechaNacimiento?: string;

  @ApiProperty({ description: 'Fecha y hora de inicio del turno', example: '2026-06-15T10:00:00.000Z' })
  @IsDateString()
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

  @ApiProperty({
    description: 'Forma de pago con la que el cliente planea pagar. Es una preferencia para agilizar el cobro en caja, no el pago real.',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  idFormaPagoPreferida: number;
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
