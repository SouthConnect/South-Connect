import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Application, Opportunity, User } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend?: Resend;
  private readonly fromEmail?: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not configured, email notifications are disabled');
    }

    if (!this.fromEmail) {
      this.logger.warn('RESEND_FROM_EMAIL not configured, email notifications may fail');
    }
  }

  private ensureClient() {
    if (!this.resend || !this.fromEmail) {
      throw new InternalServerErrorException('Email service not configured');
    }
  }

  async sendWelcomeEmail(user: User) {
    this.ensureClient();

    const subject = 'Bienvenue sur D-Fund';
    const html = `<p>Bonjour ${user.firstName || ''},</p>
      <p>Bienvenue sur D-Fund. Vous pouvez dès maintenant compléter votre profil et explorer les opportunités.</p>`;

    await this.sendEmail(user.email, subject, html);
  }

  async sendApplicationSubmittedEmail(owner: User, application: Application, opportunity: Opportunity) {
    this.ensureClient();

    const subject = `Nouvelle candidature sur votre opportunité "${opportunity.name}"`;
    const html = `<p>Bonjour ${owner.firstName || ''},</p>
      <p>Vous avez reçu une nouvelle candidature pour l'opportunité <strong>${opportunity.name}</strong>.</p>
      <p>Connectez-vous à D-Fund pour la consulter et y répondre.</p>`;

    await this.sendEmail(owner.email, subject, html);
  }

  async sendApplicationReviewedEmail(candidate: User, application: Application, opportunity: Opportunity) {
    this.ensureClient();

    const subject = `Votre candidature pour "${opportunity.name}" a été revue`;
    const html = `<p>Bonjour ${candidate.firstName || ''},</p>
      <p>Votre candidature pour l'opportunité <strong>${opportunity.name}</strong> a été revue.</p>
      <p>${application.reviewFeedback || 'Connectez-vous à D-Fund pour lire les détails du feedback.'}</p>`;

    await this.sendEmail(candidate.email, subject, html);
  }

  async sendApplicationAcceptedEmail(candidate: User, application: Application, opportunity: Opportunity) {
    this.ensureClient();

    const subject = `Bonne nouvelle pour votre candidature "${opportunity.name}"`;
    const html = `<p>Bonjour ${candidate.firstName || ''},</p>
      <p>Votre candidature pour l'opportunité <strong>${opportunity.name}</strong> a été acceptée.</p>
      <p>Nous vous invitons à prendre contact avec le créateur de l'opportunité.</p>`;

    await this.sendEmail(candidate.email, subject, html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    this.ensureClient();

    try {
      await this.resend!.emails.send({
        from: this.fromEmail!,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
      // On ne bloque pas la requête principale si l'email échoue
    }
  }
}

