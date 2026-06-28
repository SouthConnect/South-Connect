import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData } from './email-queue.types';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * BullMQ processor for the email queue.
 *
 * Picks up jobs enqueued by NotificationsService.sendEmailAsync and delegates
 * actual delivery to NotificationsService.sendEmailDirect.
 * On failure the error is re-thrown so BullMQ's built-in retry logic
 * (exponential back-off, max 5 attempts) handles the retry cycle.
 */
@Processor(EMAIL_QUEUE_NAME)
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, jobType } = job.data;
    this.logger.log(`Processing email job [${jobType}] attempt ${job.attemptsMade + 1} → ${to}`);
    try {
      await this.notificationsService.sendEmailDirect(job.data);
      this.logger.log(`Email job [${jobType}] delivered → ${to}`);
    } catch (err) {
      this.logger.error(
        `Email job [${jobType}] failed (attempt ${job.attemptsMade + 1}): ${(err as Error).message}`,
        (err as Error).stack,
      );
      // Re-throw so BullMQ marks this attempt as failed and schedules the next retry
      throw err;
    }
  }
}
