import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';

/**
 * Global exception filter that:
 *  1. Maps Prisma P2002 (unique constraint) to 409 Conflict.
 *  2. Forwards unhandled / server errors to Sentry (5xx only — 4xx are
 *     expected client errors and not worth cluttering Sentry with).
 *  3. Returns a consistent JSON error envelope to the client.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Map Prisma unique constraint violations to 409 so they never surface as 500
    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2002'
    ) {
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: 'A record with this value already exists',
      });
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only report server-side errors; 4xx are expected client mistakes
    if (status >= 500) {
      Sentry.captureException(exception);
      this.logger.error(exception);
    }

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
