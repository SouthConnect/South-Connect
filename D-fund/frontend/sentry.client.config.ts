/**
 * Sentry browser SDK — loaded in the client bundle.
 * Captures JS errors, unhandled promise rejections, and performance data.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sample 20 % of page loads for performance tracing in prod
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Show full source maps in non-prod environments
  debug: false,

  environment: process.env.NODE_ENV ?? 'development',

  // Don't initialise if DSN is absent
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Ignore common browser noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured with value: undefined',
  ],
});
