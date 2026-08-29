import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsDateString, IsDate, IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePersonaDto {
  @ApiProperty({ description: 'Nombre del cliente', example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Apellido del cliente', example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiPropertyOptional({ description: 'Email del cliente', example: 'juan@example.com' })
  @IsEmail()
  @IsOptional()
  mail?: string;

  @ApiPropertyOptional({ description: 'Teléfono del cliente', example: '+54 11 1234-5678' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento', example: '1990-05-15' })
  @IsDateString()
  @IsOptional()
  fechaNacimiento?: string;

  @ApiPropertyOptional({ description: 'Instagram del cliente', example: '@juan_perez' })
  @IsString()
  @IsOptional()
  instagram?: string;

  @ApiPropertyOptional({ description: 'Si aplica el descuento de personal al reservarle un turno', example: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  aplicaDescuentoPersonal?: boolean;
}
