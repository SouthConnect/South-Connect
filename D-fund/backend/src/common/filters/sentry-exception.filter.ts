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

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 — unique constraint: map to 409
      if (exception.code === 'P2002') {
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: 'A record with this value already exists',
        });
      }
      // P2003 — foreign key constraint: map to 422 (referenced record not found)
      if (exception.code === 'P2003') {
        return response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: 'Referenced record not found',
        });
      }
      // P2023 — malformed ID / inconsistent column data: map to 400
      if (exception.code === 'P2023') {
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: 'Invalid identifier format',
        });
      }
      // P2025 — record not found for update/delete: map to 404
      if (exception.code === 'P2025') {
        return response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: 'Record not found',
        });
      }
    }

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only report server-side errors; 4xx are expected client mistakes
    if (status >= 500) {
      Sentry.captureException(exception);
      this.logger.error(exception);
    }

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const message =
      process.env.NODE_ENV === 'production'
        ? this.sanitizeHttpResponse(rawResponse, status)
        : rawResponse;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }

  private sanitizeHttpResponse(raw: string | object, status: number): object {
    if (typeof raw === 'string') return { message: raw, statusCode: status };
    const { message } = raw as any;
    return {
      statusCode: status,
      message: Array.isArray(message)
        ? message
        : typeof message === 'string'
          ? message
          : `Error ${status}`,
    };
  }
}
