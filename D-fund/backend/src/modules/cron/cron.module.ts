import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CronService } from './cron.service';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [CronService],
})
export class CronModule {}
