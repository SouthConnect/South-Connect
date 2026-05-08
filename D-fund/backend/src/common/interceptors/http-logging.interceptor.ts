import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logs every incoming HTTP request and its response time.
 *
 * Output example (development):
 *   [HttpLogging] POST /api/v1/auth/register → 201 (142ms)
 *
 * In production the JsonLoggerService transforms this into structured JSON
 * automatically because it is wired as the application logger.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpLogging');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const start = Date.now();

    const { method, originalUrl } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`${method} ${originalUrl} → ${res.statusCode} (${ms}ms)`);
        },
        error: (err: { status?: number; message?: string }) => {
          const ms = Date.now() - start;
          const status = err?.status ?? 500;
          this.logger.warn(
            `${method} ${originalUrl} → ${status} (${ms}ms) — ${err?.message ?? 'Unknown error'}`,
          );
        },
      }),
    );
  }
}
