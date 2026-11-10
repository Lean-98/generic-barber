import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CumpleanosService, CumpleanosProximo, PreferenciaPromociones } from './cumpleanos.service';

class ProximosQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dias?: number;
}

class TokenQueryDto {
  @IsString()
  @MaxLength(200)
  token: string;
}

class PreferenciaDto extends TokenQueryDto {
  @IsBoolean()
  recibePromociones: boolean;
}

@ApiTags('Cumpleaños')
@Controller()
export class CumpleanosController {
  constructor(private readonly cumpleanosService: CumpleanosService) {}

  @Get('cumpleanos/proximos')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cumpleaños de hoy y de los próximos días, con su cupón (Dashboard)' })
  @ApiQuery({ name: 'dias', required: false, example: 7 })
  proximos(@Query() query: ProximosQueryDto): Promise<CumpleanosProximo[]> {
    return this.cumpleanosService.proximos(query.dias ?? 7);
  }

  @Get('promociones/preferencia')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ver si el cliente recibe promociones (link de baja de los mails)' })
  getPreferencia(@Query() query: TokenQueryDto): Promise<PreferenciaPromociones> {
    return this.cumpleanosService.getPreferencia(query.token);
  }

  @Post('promociones/preferencia')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Darse de baja (o volver a recibir) promociones desde el link del mail' })
  setPreferencia(@Body() dto: PreferenciaDto): Promise<PreferenciaPromociones> {
    return this.cumpleanosService.setPreferencia(dto.token, dto.recibePromociones);
  }
}
