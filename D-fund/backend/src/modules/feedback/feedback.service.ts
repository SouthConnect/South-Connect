import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { User } from '@prisma/client';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

/**
 * Accepts user feedback and forwards it to the admin email address via Resend.
 * Falls back to logging when the email client is not configured.
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private readonly resend?: Resend;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  /**
   * Submits user feedback by sending an email to the configured admin address.
   * When `RESEND_API_KEY` or `ADMIN_EMAIL` are not set, the feedback is logged instead.
   */
  async submit(user: User, dto: CreateFeedbackDto) {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    const fromEmail = this.config.get<string>('RESEND_FROM_EMAIL') || 'noreply@d-fund.app';

    if (this.resend && adminEmail) {
      try {
        const esc = (s: string) =>
          s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        await this.resend.emails.send({
          from: fromEmail,
          to: adminEmail,
          subject: `[D-Fund Feedback] ${esc(dto.title)}`,
          html: `
            <h2>New feedback from ${esc(user.name || user.email)}</h2>
            <p><strong>User:</strong> ${esc(user.name || '')} (${esc(user.email)}) — ID: ${esc(user.id)}</p>
            <p><strong>Title:</strong> ${esc(dto.title)}</p>
            <hr />
            <p>${esc(dto.description).replace(/\n/g, '<br />')}</p>
          `,
        });
      } catch (err) {
        this.logger.error('Failed to send feedback email', err);
      }
    } else {
      this.logger.log(`Feedback from ${user.email}: [${dto.title}] ${dto.description}`);
    }

    return { success: true };
  }
}
