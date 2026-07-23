// Node 18 doesn't expose `crypto` as a global — @nestjs/schedule v6 requires it.
// Must be the very first line so the global is available before any module loads.
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

// Sentry must be initialised before any other import.
// Wrapped in try/catch: native addons (profiling, OpenTelemetry) can crash
// on a fresh Docker build — app must start even without Sentry.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./instrument');
} catch (err) {
  process.stderr.write(`[Sentry] init failed — monitoring disabled: ${err}\n`);
}

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import { RedisStore } from 'connect-redis';
import { JsonLoggerService } from './common/logger/json-logger.service';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { CorsIoAdapter } from './common/adapters/cors-io.adapter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

const logger = new Logger('Bootstrap');

// P0 — capturer toute promesse rejetée non gérée avant qu'elle ne tue le process
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', reason instanceof Error ? reason.stack : String(reason));
  if (process.env.NODE_ENV === 'production') {
    const Sentry = require('@sentry/nestjs');
    Sentry.captureException(reason);
  }
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception — shutting down', err.stack);
  if (process.env.NODE_ENV === 'production') {
    const Sentry = require('@sentry/nestjs');
    Sentry.captureException(err);
  }
  process.exit(1);
});

async function bootstrap() {
  // Fail fast si les vars critiques sont absentes ou trop courtes
  const required = ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'FRONTEND_URL'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  // Les secrets JWT doivent faire au moins 32 caractères pour être sécurisés
  for (const key of ['JWT_SECRET', 'REFRESH_TOKEN_SECRET']) {
    if ((process.env[key] ?? '').length < 32) {
      throw new Error(`${key} must be at least 32 characters long`);
    }
  }
  // SESSION_SECRET doit être distinct de JWT_SECRET pour éviter la réutilisation de clé
  if (!process.env.SESSION_SECRET) {
    logger.warn('SESSION_SECRET not set — falling back to JWT_SECRET. Set a distinct SESSION_SECRET in production.');
  }
  // REDIS_PASSWORD requis en production pour sécuriser l'accès Redis
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_PASSWORD) {
    logger.warn('REDIS_PASSWORD not set in production — Redis is running without authentication.');
  }

  // Warn about optional-but-important vars
  const optional: Record<string, string> = {
    RESEND_API_KEY: 'email notifications disabled',
    SENTRY_DSN: 'error monitoring disabled',
    REDIS_URL: 'token revocation and caching disabled',
    GOOGLE_CLIENT_ID: 'Google OAuth disabled',
  };
  for (const [key, msg] of Object.entries(optional)) {
    if (!process.env[key]) {
      logger.warn(`${key} not set — ${msg}`);
    }
  }

  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? new JsonLoggerService()
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);
  app.useWebSocketAdapter(new CorsIoAdapter(app, configService));

  // Trust le premier proxy (Nginx / Railway / Render) pour que req.ip soit l'IP
  // réelle du client — requis pour le rate-limiting et les logs corrects.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Cookie parser — required for HttpOnly JWT cookie extraction
  app.use(compression());
  app.use(cookieParser());

  // Session middleware — required only for the Google OAuth state parameter (CSRF protection).
  // Uses Redis when REDIS_URL is set (production) so the OAuth state survives container restarts.
  // Falls back to in-memory MemoryStore in local dev (no Redis_URL required).
  const redisUrl = process.env.REDIS_URL;
  const sessionStore = redisUrl
    ? (() => {
        const Redis = require('ioredis');
        // Connect eagerly — lazyConnect + enableOfflineQueue:false caused the first
        // session write (OAuth state) to fail silently before Redis was ready,
        // producing a state mismatch and OAUTH_FAILED on the callback.
        const client = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
        client.on('error', (err: Error) => logger.warn(`Session Redis error: ${err.message}`));
        return new RedisStore({ client, prefix: 'sess:' });
      })()
    : undefined; // MemoryStore (dev only)

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 min — long enough for the OAuth dance
    },
  }));

  // Limit JSON body size to prevent memory-exhaustion attacks
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ limit: '1mb', extended: true }));

  // Security headers
  app.use(
    helmet({
      // This is a pure JSON API — no HTML pages are served.
      // CSP (Content-Security-Policy) only makes sense on HTML responses;
      // putting it on API responses adds no security and can confuse browsers
      // (e.g. `upgrade-insecure-requests` on preflight responses breaks HTTP
      // dev environments in Firefox).
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      // API is consumed cross-origin (frontend on a different port/domain)
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS — trim each origin to guard against trailing whitespace/commas in env
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Requests without an Origin header come from non-browser clients (curl, Postman,
      // server-to-server). CORS cannot protect against these — that is by design.
      // CSRF protection relies on SameSite=Strict cookies + JWT Bearer tokens, not CORS.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Global HTTP request/response logger (skipped in test to reduce noise)
  if (process.env.NODE_ENV !== 'test') {
    app.useGlobalInterceptors(new HttpLoggingInterceptor());
  }

  // Global Sentry error filter — captures 5xx before returning to client
  app.useGlobalFilters(new SentryExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger — available only outside production
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('D-Fund API')
      .setDescription('REST API for the D-Fund platform')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // COOKIE_DOMAIN est requis en production pour que les cookies auth soient
  // lisibles par le middleware Next.js sur le domaine frontend (Vercel).
  // Sans ça, session_hint et access_token restent bound à api.southconnect.io
  // et le middleware ne peut jamais valider la session.
  if (process.env.NODE_ENV === 'production' && !process.env.COOKIE_DOMAIN) {
    logger.warn(
      'COOKIE_DOMAIN is not set — auth cookies will be host-only to the API domain. ' +
      'The Next.js Edge middleware cannot read them, which will cause session loss on page refresh. ' +
      'Set COOKIE_DOMAIN=.southconnect.io in Railway.',
    );
  }

  const port = process.env.PORT || 3001;
  const server = await app.listen(port);
  logger.log(`Application listening on port ${port}`);

  // Graceful shutdown: let Railway / Docker finish in-flight requests before stopping
  const shutdown = async (signal: string) => {
    logger.log(`${signal} received — shutting down gracefully`);
    // Stop accepting new connections
    server.close(() => logger.log('HTTP server closed'));
    // Force-exit after 10 s if requests are still hanging
    const forceExit = setTimeout(() => {
      logger.error('Shutdown timeout exceeded — forcing exit');
      process.exit(1);
    }, 10_000);
    forceExit.unref();
    await app.close();
    clearTimeout(forceExit);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
