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
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
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
      crossOriginEmbedderPolicy: false, // allow external images/media
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );

  // CORS
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
  app.enableCors({
    origin: (origin, callback) => {
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
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
}

bootstrap();
