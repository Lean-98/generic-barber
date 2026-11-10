import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCuponDto {
  @ApiProperty({ description: 'Código que escribe el cliente (se guarda en mayúsculas)', example: 'HOY20' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,30}$/, { message: 'El código tiene que tener de 3 a 30 letras o números, sin espacios (se permiten - y _)' })
  codigo: string;

  @ApiPropertyOptional({ description: 'Texto de la promo, para el mensaje de WhatsApp', example: 'Solo por hoy 20% off en tu corte' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @ApiProperty({ description: 'Porcentaje de descuento (más de 0, hasta 100)', example: 20 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  descuentoPorcentaje: number;

  @ApiProperty({ description: 'Primer día en que se puede usar para reservar (AAAA-MM-DD, hora Argentina)', example: '2026-11-10' })
  @Matches(FECHA, { message: 'La fecha de inicio tiene que tener el formato AAAA-MM-DD' })
  desde: string;

  @ApiProperty({ description: 'Último día en que se puede usar para reservar, incluido (AAAA-MM-DD)', example: '2026-11-10' })
  @Matches(FECHA, { message: 'La fecha de fin tiene que tener el formato AAAA-MM-DD' })
  hasta: string;

  @ApiPropertyOptional({ description: 'Cupo total ("los primeros 10"). Vacío = sin límite', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usosMaximos?: number | null;
}

export class UpdateCuponDto extends PartialType(CreateCuponDto) {
  @ApiPropertyOptional({ description: 'false = pausado: no se puede usar hasta reactivarlo', example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ValidarCuponQueryDto {
  @ApiProperty({ example: 'HOY20' })
  @IsString()
  @MaxLength(30)
  codigo: string;

  @ApiPropertyOptional({ description: 'Si viene, también se fija si ese cliente ya lo usó', example: 'juan@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;
}
