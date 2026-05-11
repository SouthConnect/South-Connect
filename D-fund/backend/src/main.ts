// Sentry must be initialised before any other import
import './instrument';

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { JsonLoggerService } from './common/logger/json-logger.service';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { CorsIoAdapter } from './common/adapters/cors-io.adapter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // Fail fast if critical env vars are missing
  const required = ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'FRONTEND_URL'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
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

  // Cookie parser — required for HttpOnly JWT cookie extraction
  app.use(cookieParser());

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
      if (!origin || allowedOrigins.includes(origin)) {
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
