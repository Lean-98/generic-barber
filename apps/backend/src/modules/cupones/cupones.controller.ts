import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CuponesService, CuponPanel } from './cupones.service';
import { CreateCuponDto, UpdateCuponDto } from './dto/cupon.dto';

@ApiTags('Cupones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cupones')
export class CuponesController {
  constructor(private readonly cuponesService: CuponesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cupones con sus usos y estado' })
  findAll(): Promise<CuponPanel[]> {
    return this.cuponesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crear un cupón de descuento' })
  @ApiResponse({ status: 409, description: 'Ya existe un cupón con ese código' })
  create(@Body() dto: CreateCuponDto): Promise<CuponPanel> {
    return this.cuponesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Editar, pausar o reactivar un cupón' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCuponDto): Promise<CuponPanel> {
    return this.cuponesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar un cupón que nunca se usó' })
  @ApiResponse({ status: 400, description: 'El cupón ya se usó: hay que pausarlo' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.cuponesService.remove(id);
  }
}
