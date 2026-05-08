import { SetMetadata } from '@nestjs/common';

/**
 * Place this decorator on a route handler (or controller class) to bypass
 * the email-verification check built into JwtAuthGuard.
 *
 * Use it only on routes that must remain accessible to users who have not
 * yet confirmed their email address (e.g. GET /auth/me, POST /auth/resend-verification).
 */
export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';
export const SkipEmailVerification = () =>
  SetMetadata(SKIP_EMAIL_VERIFICATION_KEY, true);
