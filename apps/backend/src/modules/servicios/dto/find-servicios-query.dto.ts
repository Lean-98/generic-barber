import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FindServiciosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por vigencia', example: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  vigente?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por categoría', example: 'Corte' })
  @IsOptional()
  @IsString()
  categoria?: string;
}
