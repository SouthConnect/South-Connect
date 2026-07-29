import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData } from './email.types';
import { EmailService } from './email.service';

/**
 * BullMQ processor for the email queue.
 *
 * Picks up jobs enqueued by EmailService.sendEmailAsync and delegates
 * actual delivery to EmailService.sendEmailDirect.
 * On failure the error is re-thrown so BullMQ's built-in retry logic
 * (exponential back-off, max 5 attempts) handles the retry cycle.
 *
 * Lives in the same module as EmailService (no forwardRef needed) — this
 * used to depend on NotificationsService via forwardRef(), which was one
 * leg of a three-module circular dependency. Now it depends directly on
 * EmailService, a module-local sibling provider.
 */
@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, jobType } = job.data;
    this.logger.log(`Processing email job [${jobType}] attempt ${job.attemptsMade + 1} → ${to}`);
    try {
      await this.emailService.sendEmailDirect(job.data);
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
