import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const HEX_COLOR_REGEX = /^(#[0-9A-Fa-f]{6})?$/;
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class HorarioDiaDto {
  @ApiPropertyOptional({ description: 'Día de la semana, 0 = domingo (convención Date.getDay())', example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  dia: number;

  @ApiPropertyOptional({ description: 'Si el negocio está cerrado ese día', example: false })
  @IsBoolean()
  cerrado: boolean;

  @ApiPropertyOptional({ description: 'Hora de apertura (HH:mm)', example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(HORA_REGEX, { message: 'abre debe tener formato HH:mm' })
  abre?: string;

  @ApiPropertyOptional({ description: 'Hora de cierre (HH:mm)', example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(HORA_REGEX, { message: 'cierra debe tener formato HH:mm' })
  cierra?: string;

  @ApiPropertyOptional({ description: 'Hora de apertura del segundo turno, para horario partido (HH:mm)', example: '16:30' })
  @IsOptional()
  @IsString()
  @Matches(HORA_REGEX, { message: 'abre2 debe tener formato HH:mm' })
  abre2?: string;

  @ApiPropertyOptional({ description: 'Hora de cierre del segundo turno, para horario partido (HH:mm)', example: '20:00' })
  @IsOptional()
  @IsString()
  @Matches(HORA_REGEX, { message: 'cierra2 debe tener formato HH:mm' })
  cierra2?: string;
}

const CLAVES_BLOQUE_SOBRE_NOSOTROS = ['quienesSomos', 'nuestraHistoria', 'mision', 'valores'] as const;

export class BloqueSobreNosotrosDto {
  @ApiPropertyOptional({ description: 'Identificador del bloque', enum: CLAVES_BLOQUE_SOBRE_NOSOTROS })
  @IsIn(CLAVES_BLOQUE_SOBRE_NOSOTROS)
  clave: (typeof CLAVES_BLOQUE_SOBRE_NOSOTROS)[number];

  @ApiPropertyOptional({ description: 'Título del bloque', example: 'Quiénes somos' })
  @IsString()
  @MaxLength(80)
  titulo: string;

  @ApiPropertyOptional({ description: 'Descripción breve del bloque' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;
}

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

  // --- Landing page ---

  @ApiPropertyOptional({ description: 'Descripción / "Acerca de" del negocio, usada en la landing (string vacío para quitarla)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen de portada de la landing (string vacío para quitarla)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'heroImageUrl debe ser una URL https válida' })
  heroImageUrl?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto, usado en la landing' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional({ description: 'Email de contacto, usado en la landing (string vacío para quitarlo)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail({}, { message: 'email debe ser un email válido' })
  email?: string;

  @ApiPropertyOptional({ description: 'Dirección del negocio, usada en la landing' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @ApiPropertyOptional({ description: 'URL del perfil de Instagram, usada en la landing (string vacío para quitarla)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'instagramUrl debe ser una URL https válida' })
  instagramUrl?: string;

  @ApiPropertyOptional({ description: 'URL de la página de Facebook, usada en la landing (string vacío para quitarla)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'facebookUrl debe ser una URL https válida' })
  facebookUrl?: string;

  @ApiPropertyOptional({ description: 'URL para dejar una reseña en Google, usada en la landing (string vacío para quitarla)' })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'googleReviewsUrl debe ser una URL https válida' })
  googleReviewsUrl?: string;

  @ApiPropertyOptional({
    description: 'Link de WhatsApp (wa.me/...), usado en la landing (string vacío para quitarlo)',
    example: 'https://wa.me/5491112345678',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'whatsappUrl debe ser una URL https válida' })
  whatsappUrl?: string;

  @ApiPropertyOptional({ description: 'Política de reservas, usada en la landing (string vacío para quitarla)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  politicaReservas?: string;

  @ApiPropertyOptional({ description: 'Horarios de atención, usados en la landing (un elemento por día)', type: [HorarioDiaDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => HorarioDiaDto)
  horarios?: HorarioDiaDto[];

  @ApiPropertyOptional({ description: 'URLs de fotos para la galería de la landing (https)', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true, message: 'cada foto de la galería debe ser una URL https válida' })
  galeriaUrls?: string[];

  @ApiPropertyOptional({ description: 'Título de la sección/página pública de productos (string vacío para quitarlo)', example: 'Nuestros productos' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  productosTitulo?: string;

  @ApiPropertyOptional({ description: 'Descripción de la sección/página pública de productos (string vacío para quitarla)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  productosDescripcion?: string;

  @ApiPropertyOptional({ description: 'Título de la sección/página pública de cursos (string vacío para quitarlo)', example: 'Nuestros cursos' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cursosTitulo?: string;

  @ApiPropertyOptional({ description: 'Descripción de la sección/página pública de cursos (string vacío para quitarla)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cursosDescripcion?: string;

  @ApiPropertyOptional({
    description: 'Bloques de la pestaña "Sobre nosotros" (Quiénes somos, Nuestra historia, Misión, Valores)',
    type: [BloqueSobreNosotrosDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => BloqueSobreNosotrosDto)
  sobreNosotros?: BloqueSobreNosotrosDto[];
}
