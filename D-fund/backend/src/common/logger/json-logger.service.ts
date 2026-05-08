import { ConsoleLogger, LogLevel } from '@nestjs/common';

/**
 * Structured JSON logger for production environments.
 *
 * In development the standard NestJS ConsoleLogger is used instead (see app bootstrap).
 * In production each log line is a single JSON object written to stdout so that
 * log aggregators (Datadog, CloudWatch, Loki, …) can parse it without additional
 * parsing rules.
 *
 * Format: { level, timestamp, context, message, ...meta }
 */
export class JsonLoggerService extends ConsoleLogger {
  private readonly isProd = process.env.NODE_ENV === 'production';

  /** Maps NestJS log level names to standard severity strings. */
  private static levelMap: Record<LogLevel, string> = {
    verbose: 'verbose',
    debug: 'debug',
    log: 'info',
    warn: 'warn',
    error: 'error',
    fatal: 'fatal',
  };

  override log(message: unknown, ...optionalParams: unknown[]) {
    this.emit('log', message, optionalParams);
  }

  override warn(message: unknown, ...optionalParams: unknown[]) {
    this.emit('warn', message, optionalParams);
  }

  override error(message: unknown, ...optionalParams: unknown[]) {
    this.emit('error', message, optionalParams);
  }

  override debug(message: unknown, ...optionalParams: unknown[]) {
    this.emit('debug', message, optionalParams);
  }

  override verbose(message: unknown, ...optionalParams: unknown[]) {
    this.emit('verbose', message, optionalParams);
  }

  private emit(level: LogLevel, message: unknown, optionalParams: unknown[]) {
    if (!this.isProd) {
      // Delegate to the default pretty-printer in dev/test
      super[level](message, ...optionalParams);
      return;
    }

    const context =
      typeof optionalParams[0] === 'string' ? (optionalParams.shift() as string) : this.context;

    const entry: Record<string, unknown> = {
      level: JsonLoggerService.levelMap[level] ?? level,
      timestamp: new Date().toISOString(),
      context: context ?? 'App',
      message,
    };

    // If the first remaining param looks like a stack trace (Error or string with newlines), attach it
    if (optionalParams.length > 0) {
      const extra = optionalParams[0];
      if (typeof extra === 'string') {
        entry['stack'] = extra;
      } else if (extra instanceof Error) {
        entry['stack'] = extra.stack;
        entry['errorName'] = extra.name;
      } else if (extra !== undefined) {
        entry['meta'] = extra;
      }
    }

    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}
