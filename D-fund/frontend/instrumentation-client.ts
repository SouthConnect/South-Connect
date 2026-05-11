import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  debug: false,
  environment: process.env.NODE_ENV ?? 'development',
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured with value: undefined',
  ],
});
