import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Nombre de usuario o email', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ description: 'Contraseña', example: 'admin123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
