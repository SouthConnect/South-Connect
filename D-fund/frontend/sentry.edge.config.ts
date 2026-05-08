/**
 * Sentry Edge runtime SDK — loaded for Next.js middleware and edge routes.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  debug: false,
  environment: process.env.NODE_ENV ?? 'development',
  enabled: Boolean(process.env.SENTRY_DSN),
});
