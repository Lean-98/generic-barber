import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';

const HEX_COLOR_REGEX = /^(#[0-9A-Fa-f]{6})?$/;

export class UpdateConfiguracionDto {
  @ApiPropertyOptional({ description: 'Nombre del negocio', example: 'Barbería El Corte' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'URL del logo alojado en Cloudinary (string vacío para quitarlo)',
    example: 'https://res.cloudinary.com/demo/image/upload/logo.png',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'logoUrl debe ser una URL https válida' })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'URL del ícono/favicon alojado en Cloudinary (string vacío para quitarlo)',
    example: 'https://res.cloudinary.com/demo/image/upload/icono.png',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'iconoUrl debe ser una URL https válida' })
  iconoUrl?: string;

  @ApiPropertyOptional({ description: 'Color primario en hexadecimal (string vacío para quitarlo)', example: '#A9762F' })
  @IsString()
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, { message: 'colorPrimario debe ser un color hexadecimal, ej: #A9762F' })
  colorPrimario?: string;

  @ApiPropertyOptional({ description: 'Color secundario en hexadecimal (string vacío para quitarlo)', example: '#7A2E2E' })
  @IsString()
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, { message: 'colorSecundario debe ser un color hexadecimal, ej: #7A2E2E' })
  colorSecundario?: string;
}
