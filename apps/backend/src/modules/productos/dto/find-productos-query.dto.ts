import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FindProductosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por vigencia', example: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  vigente?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por ID de categoría', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idCategoria?: number;
}
