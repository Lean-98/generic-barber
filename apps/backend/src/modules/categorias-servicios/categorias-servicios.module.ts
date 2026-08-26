import { Module } from '@nestjs/common';
import { CategoriasServiciosService } from './categorias-servicios.service';
import { CategoriasServiciosController } from './categorias-servicios.controller';

@Module({
  controllers: [CategoriasServiciosController],
  providers: [CategoriasServiciosService],
  exports: [CategoriasServiciosService],
})
export class CategoriasServiciosModule {}
