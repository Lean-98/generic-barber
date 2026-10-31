import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, Length } from 'class-validator';

export class Verify2faDto {
  @ApiProperty({ description: 'Nombre de usuario o email usado en el login', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ description: 'Código de 6 dígitos recibido por correo', example: '482913' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({
    description: 'Si es true, no vuelve a pedir 2FA desde este dispositivo por 30 días',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  recordarDispositivo?: boolean;
}
