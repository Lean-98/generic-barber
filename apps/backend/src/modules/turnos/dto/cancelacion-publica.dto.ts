import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Token del link "Cancelar turno" que llega por mail (ver cancelacion-token.util.ts). */
export class CancelacionPublicaDto {
  @ApiProperty({ description: 'Token firmado del link de cancelación', example: '42.Zm9v...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  token: string;
}
