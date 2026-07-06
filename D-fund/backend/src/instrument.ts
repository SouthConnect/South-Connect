/**
 * Sentry instrumentation — must be imported BEFORE any other module.
 * NestJS SDK wraps the standard Sentry Node SDK and adds:
 *  - automatic exception capture via SentryGlobalFilter
 *  - performance tracing for HTTP requests
 *  - NestJS context (controller, guard, pipe) in breadcrumbs
 */
import * as Sentry from '@sentry/nestjs';

// @sentry/profiling-node is intentionally NOT installed — its C++ native addon
// caused silent segfaults on fresh Docker builds, killing the process before
// any Node.js output and making Railway healthchecks fail. Sentry error tracking
// works fully without it; only CPU profiling is absent.

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  integrations: [],

  environment: process.env.NODE_ENV ?? 'development',

  enabled: Boolean(process.env.SENTRY_DSN),

  // Strip sensitive data before sending to Sentry
  beforeSend(event) {
    // Remove Bearer tokens from exception messages and request context
    const redact = (s: string) =>
      s
        .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
        .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]')
        .replace(/"password"\s*:\s*"[^"]*"/g, '"password":"[REDACTED]"');

    if (event.message) event.message = redact(event.message);

    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = redact(ex.value);
      }
    }

    // Remove cookies and auth headers from request context
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete (event.request.headers as Record<string, unknown>)['authorization'];
        delete (event.request.headers as Record<string, unknown>)['cookie'];
      }
    }

    return event;
  },
});
