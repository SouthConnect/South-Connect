import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import * as Sentry from '@sentry/nestjs';

/**
 * WebSocket counterpart to SentryExceptionFilter — errors thrown inside
 * ChatGateway handlers previously had no Sentry capture at all (only HTTP
 * 5xx did, via the global SentryExceptionFilter, which can't handle a WS
 * ArgumentsHost). Applied via `@UseFilters(WsSentryExceptionFilter)` on
 * ChatGateway.
 *
 * WsException (bad payload, unauthorized join/typing) is expected
 * client-facing behavior — not reported to Sentry, mirroring how
 * SentryExceptionFilter only reports HTTP 5xx and not 4xx.
 */
@Catch()
export class WsSentryExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsSentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof WsException)) {
      Sentry.captureException(exception);
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }
    super.catch(exception as Error, host);
  }
}
