import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsEmail, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Nombre de usuario', example: 'peluquero' })
  @IsString()
  @IsNotEmpty()
  usuario: string;

  @ApiProperty({ description: 'Email', example: 'peluquero@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Contraseña', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Nombre del peluquero', example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Apellido del peluquero', example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '+54 11 1234-5678' })
  @IsString()
  @IsOptional()
  telefono?: string;
}
