import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CategoriasServiciosService } from './categorias-servicios.service';
import { CreateCategoriaServicioDto } from './dto/create-categoria-servicio.dto';
import { UpdateCategoriaServicioDto } from './dto/update-categoria-servicio.dto';
import { CategoriaServicio } from '@prisma/client';

@ApiTags('Categorías de servicios')
@Controller('categorias-servicios')
export class CategoriasServiciosController {
  constructor(private readonly categoriasServiciosService: CategoriasServiciosService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear una nueva categoría de servicio' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() createCategoriaServicioDto: CreateCategoriaServicioDto): Promise<CategoriaServicio> {
    return this.categoriasServiciosService.create(createCategoriaServicioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las categorías de servicios' })
  @ApiResponse({ status: 200, description: 'Lista de categorías' })
  @ApiQuery({ name: 'vigente', required: false, type: Boolean })
  async findAll(@Query('vigente') vigente?: string): Promise<CategoriaServicio[]> {
    return this.categoriasServiciosService.findAll(vigente === undefined ? undefined : vigente === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría de servicio por ID' })
  @ApiResponse({ status: 200, description: 'Categoría encontrada' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CategoriaServicio> {
    return this.categoriasServiciosService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar una categoría de servicio' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoriaServicioDto: UpdateCategoriaServicioDto,
  ): Promise<CategoriaServicio> {
    return this.categoriasServiciosService.update(id, updateCategoriaServicioDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una categoría de servicio (lógico)' })
  @ApiResponse({ status: 200, description: 'Categoría marcada como no vigente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<CategoriaServicio> {
    return this.categoriasServiciosService.remove(id);
  }
}
