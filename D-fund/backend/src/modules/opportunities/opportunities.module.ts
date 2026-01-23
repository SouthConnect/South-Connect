import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OpportunitiesService } from './opportunities.service';
import { OpportunitiesController } from './opportunities.controller';

@Module({
  imports: [PrismaModule],
  providers: [OpportunitiesService],
  controllers: [OpportunitiesController],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}


