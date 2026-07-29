import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';
import { EmailModule } from '../email/email.module';

/**
 * Manages in-app notifications and transactional email.
 *
 * MessagesModule is imported with forwardRef to avoid a circular dependency:
 *   MessagesModule → NotificationsModule → MessagesModule (ChatGateway, for
 *   real-time push of newly-created in-app notifications).
 * The ChatGateway is injected as @Optional() in NotificationsService so the
 * module can still boot if MessagesModule is not loaded (e.g. in unit tests).
 *
 * EmailModule is imported normally (no forwardRef) — it owns the Resend
 * client and the BullMQ email queue and has no dependency back on this
 * module, so there is nothing circular about this edge. This used to be
 * forwardRef(() => EmailQueueModule) because the queue's processor called
 * back into NotificationsService; that responsibility now lives entirely in
 * EmailModule (see email.service.ts / email.processor.ts).
 */
@Module({
  imports: [ConfigModule, PrismaModule, EmailModule, forwardRef(() => MessagesModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
