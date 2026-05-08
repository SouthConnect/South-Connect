/**
 * Sentry instrumentation — must be imported BEFORE any other module.
 * NestJS SDK wraps the standard Sentry Node SDK and adds:
 *  - automatic exception capture via SentryGlobalFilter
 *  - performance tracing for HTTP requests
 *  - NestJS context (controller, guard, pipe) in breadcrumbs
 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Capture 100 % of transactions in dev, sample in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // CPU profiling (requires @sentry/profiling-node)
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,

  integrations: [nodeProfilingIntegration()],

  environment: process.env.NODE_ENV ?? 'development',

  // Don't initialise if DSN is absent (local dev without Sentry account)
  enabled: Boolean(process.env.SENTRY_DSN),
});
