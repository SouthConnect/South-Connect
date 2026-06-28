/**
 * Defines the shape of a job enqueued in the email BullMQ queue.
 */
export const EMAIL_QUEUE_NAME = 'email';

export interface EmailJobData {
  /** Recipient email address. */
  to: string;
  /** Email subject line. */
  subject: string;
  /** Full HTML body of the email. */
  html: string;
  /**
   * When true, the unsubscribe footer is omitted.
   * Set to false for marketing/transactional non-critical emails.
   */
  skipUnsubscribeFooter: boolean;
  /** Human-readable job type identifier used in log messages. */
  jobType: string;
}
