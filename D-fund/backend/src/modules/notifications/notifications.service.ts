import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Application, Opportunity, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../messages/chat.gateway';

/**
 * Manages in-app notifications and transactional email delivery.
 *
 * Email is sent via Resend. When the `RESEND_API_KEY` environment variable is
 * absent the service falls back to mock logging so local development works
 * without an email provider.
 *
 * Email subjects and body copy are intentionally written in French because the
 * application targets a French-speaking audience.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend?: Resend;
  private readonly fromEmail?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Optional() private readonly chatGateway?: ChatGateway,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not configured — email notifications are disabled');
    }

    if (!this.fromEmail) {
      this.logger.warn('RESEND_FROM_EMAIL not configured — email notifications may fail');
    }
  }

  /** Returns true when the email client is ready to send. */
  private hasEmailClient(): boolean {
    return Boolean(this.resend && this.fromEmail);
  }

  /** Maps notification type strings to their NotificationPreferences field. */
  private static readonly IN_APP_PREF: Record<string, string> = {
    APPLICATION_SUBMITTED: 'inAppApplicationSubmitted',
    APPLICATION_RECEIVED: 'inAppApplicationSubmitted', // owner-side: same preference
    APPLICATION_REVIEWED: 'inAppApplicationReviewed',
    APPLICATION_ACCEPTED: 'inAppApplicationAccepted',
    OPPORTUNITY_APPROVED: 'inAppOpportunityApproved',
    OPPORTUNITY_REJECTED: 'inAppOpportunityRejected',
    NEW_MESSAGE: 'inAppNewMessage',
    NEW_FOLLOWER: 'inAppNewFollower',
  };

  /**
   * Returns the notification preferences record for a user.
   * Falls back to an all-true default object when the record does not exist,
   * so a missing preferences row never silently suppresses a notification.
   */
  private async loadPrefs(userId: string) {
    return this.prisma.notificationPreferences.findUnique({ where: { userId } });
  }

  /**
   * Persists an in-app notification for a user and pushes it to the user's
   * active WebSocket connections (if any) for real-time delivery.
   * Respects the user's in-app notification preferences.
   * Errors are caught and logged so a notification failure never blocks the caller.
   */
  async createInApp(userId: string, type: string, title: string, body?: string, link?: string) {
    try {
      const prefKey = NotificationsService.IN_APP_PREF[type];
      if (prefKey) {
        // .catch(() => null) ensures a loadPrefs failure never silently swallows the notification
        const prefs = await this.loadPrefs(userId).catch(() => null);
        if (prefs && (prefs as Record<string, unknown>)[prefKey] === false) return;
      }

      const notification = await this.prisma.notification.create({
        data: { userId, type, title, body, link },
      });

      // Push real-time delivery if the user is currently connected via WebSocket
      this.chatGateway?.sendToUser(userId, 'notification', notification);
    } catch (err) {
      this.logger.error(`Failed to create in-app notification: ${err.message}`);
    }
  }

  /** Returns paginated notifications for a user, most recent first. */
  findAll(userId: string, take = 50, skip = 0) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  /** Returns the count of unread notifications for a user. */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /**
   * Marks a single notification as read.
   * Uses updateMany with userId filter so users can only mark their own notifications.
   */
  async markRead(userId: string, id: string): Promise<{ success: boolean }> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  /**
   * Returns the notification preferences for a user.
   * Creates a record with all defaults on first access (upsert pattern).
   */
  async getPreferences(userId: string) {
    return this.prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  /**
   * Updates notification preferences for a user.
   * Only provided fields are changed — all others remain as-is.
   */
  async updatePreferences(userId: string, data: Partial<{
    emailApplicationSubmitted: boolean;
    emailApplicationReviewed: boolean;
    emailApplicationAccepted: boolean;
    emailOpportunityApproved: boolean;
    emailOpportunityRejected: boolean;
    emailNewMessage: boolean;
    emailNewFollower: boolean;
    inAppApplicationSubmitted: boolean;
    inAppApplicationReviewed: boolean;
    inAppApplicationAccepted: boolean;
    inAppOpportunityApproved: boolean;
    inAppOpportunityRejected: boolean;
    inAppNewMessage: boolean;
    inAppNewFollower: boolean;
  }>) {
    return this.prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  /** Marks all unread notifications as read for a user. */
  async markAllRead(userId: string): Promise<{ success: boolean }> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  /**
   * Sends an email verification message to the given user.
   * Falls back to a log entry when the email client is not configured.
   */
  async sendEmailVerification(user: User, verificationLink: string) {
    if (!this.resend || !this.fromEmail) {
      // Do NOT log the token — it could appear in production log aggregators.
      this.logger.warn(`[mock] Email service not configured — skipping verification email to ${user.email}`);
      return;
    }

    const subject = 'Confirmez votre adresse email D-Fund';
    const html = `
      <p>Bonjour ${user.firstName || ''},</p>
      <p>Merci de vous être inscrit sur D-Fund. Cliquez sur le lien ci-dessous pour confirmer votre adresse email :</p>
      <p>
        <a href="${verificationLink}"
           style="display:inline-block;padding:10px 20px;background:#3b49df;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Confirmer mon email
        </a>
      </p>
      <p style="color:#888;font-size:12px">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
    `;

    await this.sendEmail(user.email, subject, html, true); // critical: always deliver
  }

  /**
   * Returns true when the user's preferences allow sending a given email type.
   * If no preferences row exists, defaults to true (deliver).
   */
  private async isEmailPrefEnabled(
    userId: string,
    prefKey: keyof {
      emailApplicationSubmitted: boolean;
      emailApplicationReviewed: boolean;
      emailApplicationAccepted: boolean;
      emailOpportunityApproved: boolean;
      emailOpportunityRejected: boolean;
      emailNewMessage: boolean;
      emailNewFollower: boolean;
    },
  ): Promise<boolean> {
    const prefs = await this.loadPrefs(userId).catch(() => null);
    if (!prefs) return true; // no preferences row → deliver by default
    return prefs[prefKey] !== false;
  }

  /**
   * Sends a welcome email after registration.
   * Falls back to a log entry when the email client is not configured.
   */
  async sendWelcomeEmail(user: User) {
    if (!this.resend || !this.fromEmail) {
      this.logger.warn(`[mock] Email service not configured — skipping welcome email to ${user.email}`);
      return;
    }

    const subject = 'Bienvenue sur D-Fund';
    const html = `
      <p>Bonjour ${user.firstName || ''},</p>
      <p>Bienvenue sur D-Fund. Vous pouvez dès maintenant compléter votre profil et explorer les opportunités.</p>
    `;

    await this.sendEmail(user.email, subject, html);
  }

  /**
   * Notifies an opportunity owner that a new application has been submitted.
   * Throws when the email client is not configured.
   */
  async sendApplicationSubmittedEmail(
    owner: User,
    application: Application,
    opportunity: Opportunity,
  ) {
    if (!this.hasEmailClient()) {
      this.logger.warn(`[mock] Email service not configured — skipping application submitted email to ${owner.email}`);
      return;
    }
    if (!await this.isEmailPrefEnabled(owner.id, 'emailApplicationSubmitted')) return;

    const subject = `Nouvelle candidature sur votre opportunité "${opportunity.name}"`;
    const html = `
      <p>Bonjour ${owner.firstName || ''},</p>
      <p>Vous avez reçu une nouvelle candidature pour l'opportunité <strong>${opportunity.name}</strong>.</p>
      <p>Connectez-vous à D-Fund pour la consulter et y répondre.</p>
    `;

    await this.sendEmail(owner.email, subject, html);
  }

  /**
   * Notifies a candidate that their application has been reviewed.
   * Throws when the email client is not configured.
   */
  async sendApplicationReviewedEmail(
    candidate: User,
    application: Application,
    opportunity: Opportunity,
  ) {
    if (!this.hasEmailClient()) {
      this.logger.warn(`[mock] Email service not configured — skipping application reviewed email to ${candidate.email}`);
      return;
    }
    if (!await this.isEmailPrefEnabled(candidate.id, 'emailApplicationReviewed')) return;

    const subject = `Votre candidature pour "${opportunity.name}" a été revue`;
    const html = `
      <p>Bonjour ${candidate.firstName || ''},</p>
      <p>Votre candidature pour l'opportunité <strong>${opportunity.name}</strong> a été revue.</p>
      <p>${application.reviewFeedback || 'Connectez-vous à D-Fund pour lire les détails du feedback.'}</p>
    `;

    await this.sendEmail(candidate.email, subject, html);
  }

  /**
   * Notifies a candidate that their application has been accepted.
   * Throws when the email client is not configured.
   */
  async sendApplicationAcceptedEmail(
    candidate: User,
    application: Application,
    opportunity: Opportunity,
  ) {
    if (!this.hasEmailClient()) {
      this.logger.warn(`[mock] Email service not configured — skipping application accepted email to ${candidate.email}`);
      return;
    }
    if (!await this.isEmailPrefEnabled(candidate.id, 'emailApplicationAccepted')) return;

    const subject = `Bonne nouvelle pour votre candidature "${opportunity.name}"`;
    const html = `
      <p>Bonjour ${candidate.firstName || ''},</p>
      <p>Votre candidature pour l'opportunité <strong>${opportunity.name}</strong> a été acceptée.</p>
      <p>Nous vous invitons à prendre contact avec le créateur de l'opportunité.</p>
    `;

    await this.sendEmail(candidate.email, subject, html);
  }

  /**
   * Notifies an opportunity owner that their opportunity has been approved.
   * Falls back to a log entry when the email client is not configured.
   */
  async sendOpportunityApprovedEmail(
    owner: Pick<User, 'id' | 'email' | 'firstName' | 'name'>,
    opportunity: Opportunity,
  ) {
    if (!this.resend || !this.fromEmail) {
      this.logger.warn(
        `[mock] Email service not configured — skipping opportunity approved email to ${owner.email}`,
      );
      return;
    }
    if (!await this.isEmailPrefEnabled(owner.id, 'emailOpportunityApproved')) return;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    const subject = `Votre opportunité "${opportunity.name}" a été approuvée`;
    const html = `
      <p>Bonjour ${owner.firstName || ''},</p>
      <p>Votre opportunité <strong>${opportunity.name}</strong> vient d'être approuvée par l'équipe D-Fund.</p>
      <p>Elle est maintenant visible par l'ensemble de la communauté.</p>
      <p><a href="${frontendUrl}/opportunities/${opportunity.id}">Voir mon opportunité</a></p>
    `;

    await this.sendEmail(owner.email, subject, html);
  }

  /**
   * Notifies a user that they have received a new private message.
   * Falls back to a log entry when the email client is not configured.
   */
  async sendNewMessageEmail(
    recipient: User,
    senderName: string,
    preview: string,
    discussionId: string,
  ) {
    if (!this.resend || !this.fromEmail) {
      this.logger.warn(`[mock] Email service not configured — skipping new message email to ${recipient.email}`);
      return;
    }
    if (!await this.isEmailPrefEnabled(recipient.id, 'emailNewMessage')) return;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    const subject = `Nouveau message de ${senderName} sur D-Fund`;
    const html = `
      <p>Bonjour ${recipient.firstName || ''},</p>
      <p><strong>${senderName}</strong> vous a envoyé un message :</p>
      <blockquote style="border-left:3px solid #3b49df;padding-left:12px;color:#555">${preview}</blockquote>
      <p><a href="${frontendUrl}/chat/private/${discussionId}">Répondre sur D-Fund</a></p>
    `;

    await this.sendEmail(recipient.email, subject, html);
  }

  /**
   * Notifies a user by email that someone new is following them.
   * Falls back to a log entry when the email client is not configured.
   */
  async sendNewFollowerEmail(follower: User, followee: User) {
    if (!this.resend || !this.fromEmail) {
      this.logger.warn(`[mock] Email service not configured — skipping new follower email to ${followee.email}`);
      return;
    }
    if (!await this.isEmailPrefEnabled(followee.id, 'emailNewFollower')) return;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    const subject = `${follower.name ?? 'Quelqu\'un'} vous suit maintenant sur D-Fund`;
    const html = `
      <p>Bonjour ${followee.firstName || ''},</p>
      <p><strong>${follower.name ?? 'Un utilisateur'}</strong> vient de commencer à vous suivre sur D-Fund.</p>
      <p>
        <a href="${frontendUrl}/profiles/${follower.id}"
           style="display:inline-block;padding:10px 20px;background:#3b49df;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Voir son profil
        </a>
      </p>
    `;

    await this.sendEmail(followee.email, subject, html);
  }

  /**
   * Notifies a user that their password was just changed.
   * This is a critical security email — delivered even if the user has opted out of marketing.
   */
  async sendPasswordChangedEmail(user: User) {
    if (!this.hasEmailClient()) {
      this.logger.warn(`[mock] Email service not configured — skipping password changed email to ${user.email}`);
      return;
    }

    const subject = 'Votre mot de passe D-Fund a été modifié';
    const html = `
      <p>Bonjour ${user.firstName || ''},</p>
      <p>Votre mot de passe a bien été réinitialisé. Toutes vos sessions actives ont été révoquées.</p>
      <p>Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement en répondant à cet email.</p>
    `;

    await this.sendEmail(user.email, subject, html, true); // critical: always deliver
  }

  /**
   * Sends a password-reset link to the given user.
   * Throws when the email client is not configured.
   */
  async sendPasswordResetEmail(user: User, resetLink: string) {
    if (!this.hasEmailClient()) {
      this.logger.warn(`[mock] Email service not configured — skipping password reset email to ${user.email}`);
      return;
    }

    const subject = 'Réinitialisation de votre mot de passe D-Fund';
    const html = `
      <p>Bonjour ${user.firstName || ''},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p><a href="${resetLink}">Cliquez ici pour choisir un nouveau mot de passe</a></p>
      <p>Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `;

    await this.sendEmail(user.email, subject, html, true); // critical: always deliver
  }

  /**
   * Low-level email sender.
   *
   * When `skipUnsubscribeFooter` is false (default) this method:
   *  1. Looks up the recipient to check their opt-out preference — skips sending if opted out.
   *  2. Appends a RGPD-compliant unsubscribe footer using the user's permanent token.
   *
   * Pass `skipUnsubscribeFooter = true` for critical transactional emails (verification,
   * password reset) that must always be delivered regardless of marketing preferences.
   *
   * Errors are caught and logged so transient failures do not propagate to callers.
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    skipUnsubscribeFooter = false,
  ) {
    let finalHtml = html;

    if (!skipUnsubscribeFooter) {
      const user = await this.prisma.user
        .findUnique({ where: { email: to }, select: { emailOptOut: true, emailUnsubscribeToken: true } })
        .catch(() => null);

      if (user?.emailOptOut) return; // silently skip — user opted out

      if (user?.emailUnsubscribeToken) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? '';
        finalHtml += `
          <hr style="margin:40px 0;border:none;border-top:1px solid #eee">
          <p style="color:#888;font-size:12px;text-align:center">
            Vous recevez cet email car vous êtes inscrit sur D-Fund.<br>
            <a href="${frontendUrl}/unsubscribe?token=${user.emailUnsubscribeToken}"
               style="color:#aaa;text-decoration:underline">
              Se désabonner des emails
            </a>
          </p>
        `;
      }
    }

    try {
      // Abort if Resend stalls for more than 10 s
      const send = this.resend!.emails.send({ from: this.fromEmail!, to, subject, html: finalHtml });
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Resend timeout after 10 s')), 10_000);
      });
      await Promise.race([send, timeout]).finally(() => clearTimeout(timeoutId!));
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
    }
  }
}
