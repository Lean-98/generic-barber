import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FindTurnosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Fecha desde (ISO 8601)', example: '2026-08-01' })
  @IsOptional()
  @IsISO8601()
  fechaDesde?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO 8601)', example: '2026-08-31' })
  @IsOptional()
  @IsISO8601()
  fechaHasta?: string;
}
