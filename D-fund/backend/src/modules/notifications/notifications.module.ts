import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';

/**
 * Manages in-app notifications and transactional email.
 *
 * MessagesModule is imported with forwardRef to avoid a circular dependency:
 *   MessagesModule → NotificationsModule → MessagesModule (ChatGateway).
 * The ChatGateway is injected as @Optional() in NotificationsService so the
 * module can still boot if MessagesModule is not loaded (e.g. in unit tests).
 */
@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => MessagesModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
