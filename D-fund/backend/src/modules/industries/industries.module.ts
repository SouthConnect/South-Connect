import { Module } from '@nestjs/common';
import { IndustriesController } from './industries.controller';
import { IndustriesService } from './industries.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IndustriesController],
  providers: [IndustriesService],
  exports: [IndustriesService],
})
export class IndustriesModule {}
