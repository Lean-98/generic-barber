import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { CumpleanosController } from './cumpleanos.controller';
import { CumpleanosService } from './cumpleanos.service';

@Module({
  imports: [MailModule],
  controllers: [CumpleanosController],
  providers: [CumpleanosService],
})
export class CumpleanosModule {}
