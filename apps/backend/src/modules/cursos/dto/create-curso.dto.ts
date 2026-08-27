import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, IsArray, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCursoDto {
  @ApiProperty({ description: 'Nombre del curso', example: 'Barbería profesional' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Bajada corta debajo del nombre', example: 'Aprendé barbería desde cero' })
  @IsString()
  @IsOptional()
  subtitulo?: string;

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

  @ApiPropertyOptional({ description: 'Temario, un ítem por línea', example: ['Manejo de máquinas', 'Técnicas de degradado'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  temario?: string[];

  @ApiPropertyOptional({ description: 'Fecha de inicio del curso', example: '2026-09-07' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  fechaInicio?: Date;

  @ApiPropertyOptional({ description: 'Fecha de finalización del curso', example: '2026-12-07' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  fechaFin?: Date;

  @ApiPropertyOptional({ description: 'Días de la semana en que se cursa', example: ['Lunes', 'Miércoles'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  diaCursada?: string[];

  @ApiPropertyOptional({ description: 'Horario de la clase', example: '19 a 22 hs' })
  @IsString()
  @IsOptional()
  horario?: string;

  @ApiPropertyOptional({ description: 'Lugar donde se dicta el curso', example: 'Avenida Fuerza Aérea 3755' })
  @IsString()
  @IsOptional()
  lugar?: string;

  @ApiPropertyOptional({ description: 'Cantidad de cupos disponibles', example: 10 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  cupos?: number;

  @ApiPropertyOptional({ description: 'Fecha desde la que se puede inscribir', example: '2026-08-01' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  inscripcionInicio?: Date;

  @ApiPropertyOptional({ description: 'Fecha límite de inscripción', example: '2026-09-05' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  inscripcionHasta?: Date;

  @ApiPropertyOptional({ description: 'Aviso destacado, ej. requisito de modelo', example: 'Contar con modelo a partir de la 2da clase' })
  @IsString()
  @IsOptional()
  requisitoImportante?: string;

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
