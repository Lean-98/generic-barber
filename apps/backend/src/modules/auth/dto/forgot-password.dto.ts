import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email de la cuenta', example: 'peluquero@example.com' })
  @IsEmail()
  email: string;
}
