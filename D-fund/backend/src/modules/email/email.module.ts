import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EMAIL_QUEUE_NAME } from './email.types';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';

/**
 * Owns email delivery mechanics: the Resend client, the BullMQ email queue,
 * and its processor.
 *
 * This module has no dependency on NotificationsModule or MessagesModule —
 * it is a leaf in the dependency graph. NotificationsModule imports it
 * directly (no forwardRef) to build and dispatch templated notification
 * emails via EmailService.
 *
 * The Redis connection is derived from the REDIS_URL environment variable.
 * When REDIS_URL is absent the module can still be imported — BullMQ will
 * fail to connect but EmailService falls back to synchronous delivery
 * because the queue is injected as @Optional().
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          url: process.env.REDIS_URL,
        },
      }),
    }),
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}
