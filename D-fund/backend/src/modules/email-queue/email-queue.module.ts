import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EMAIL_QUEUE_NAME } from './email-queue.types';
import { EmailQueueProcessor } from './email-queue.processor';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Registers the BullMQ email queue and its processor.
 *
 * The Redis connection is derived from the REDIS_URL environment variable.
 * When REDIS_URL is absent the module can still be imported — BullMQ will
 * fail to connect but NotificationsService falls back to synchronous delivery
 * because the queue is injected as @Optional().
 */
@Module({
  imports: [
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
    forwardRef(() => NotificationsModule),
  ],
  providers: [EmailQueueProcessor],
  exports: [BullModule],
})
export class EmailQueueModule {}
