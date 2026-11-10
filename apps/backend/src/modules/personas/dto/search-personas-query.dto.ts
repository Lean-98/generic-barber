import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class SearchPersonasQueryDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Texto de búsqueda', example: 'juan' })
  @IsString()
  @IsNotEmpty()
  q: string;
}

export class CumplenMesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Mes (1 a 12). Por defecto, el actual', example: 11 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;
}
