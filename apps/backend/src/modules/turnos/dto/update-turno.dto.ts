import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTurnoDto } from './create-turno.dto';

export class UpdateTurnoDto extends PartialType(
  OmitType(CreateTurnoDto, ['servicios'] as const),
) {}
