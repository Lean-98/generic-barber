import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCursoDto {
  @ApiProperty({ description: 'Nombre del curso', example: 'Barbería profesional' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción del curso', example: 'Formación integral en técnicas de corte y afeitado' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ description: 'Precio del curso', example: 60000.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  precio: number;

  @ApiPropertyOptional({ description: 'Duración del curso, en texto libre', example: '8 semanas' })
  @IsString()
  @IsOptional()
  duracion?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen del curso', example: 'https://example.com/curso.jpg' })
  @IsString()
  @IsOptional()
  urlImagen?: string;

  @ApiPropertyOptional({ description: 'Indica si el curso está vigente', example: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  vigente?: boolean;
}
