import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class SearchPersonasQueryDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Texto de búsqueda', example: 'juan' })
  @IsString()
  @IsNotEmpty()
  q: string;
}
