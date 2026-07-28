import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContext } from '../context/request-context';

/**
 * Logs every incoming HTTP request and its response time.
 *
 * Output example (development):
 *   [HttpLogging] [a1b2c3d4] POST /api/v1/auth/register → 201 (142ms)
 *
 * In production the JsonLoggerService transforms this into structured JSON
 * automatically because it is wired as the application logger — the request ID
 * is attached there too (as a `requestId` field, read from the same
 * AsyncLocalStorage context set by requestIdMiddleware), it's prefixed here
 * as well purely so it's visible in the unstructured dev console output.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpLogging');

  /** Supprime les paramètres sensibles de l'URL avant de logger. */
  private sanitizeUrl(url: string): string {
    try {
      const [path, qs] = url.split('?');
      if (!qs) return url;
      const params = new URLSearchParams(qs);
      for (const key of ['token', 'access_token', 'refresh_token', 'secret', 'password', 'key']) {
        if (params.has(key)) params.set(key, '[REDACTED]');
      }
      return `${path}?${params.toString()}`;
    } catch {
      return url;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const start = Date.now();

    const { method } = req;
    const url = this.sanitizeUrl(req.originalUrl);
    const requestId = RequestContext.getRequestId();
    const prefix = requestId ? `[${requestId.slice(0, 8)}] ` : '';

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`${prefix}${method} ${url} → ${res.statusCode} (${ms}ms)`);
        },
        error: (err: { status?: number; message?: string }) => {
          const ms = Date.now() - start;
          const status = err?.status ?? 500;
          this.logger.warn(
            `${prefix}${method} ${url} → ${status} (${ms}ms) — ${err?.message ?? 'Unknown error'}`,
          );
        },
      }),
    );
  }
}
