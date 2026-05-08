import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';
import { ConfigService } from '@nestjs/config';

/**
 * Custom Socket.IO adapter that restricts WebSocket CORS to the same origins
 * allowed by the HTTP layer (FRONTEND_URL env var), instead of the insecure
 * wildcard `origin: '*'` default.
 *
 * Usage in main.ts:
 *   const configService = app.get(ConfigService);
 *   app.useWebSocketAdapter(new CorsIoAdapter(app, configService));
 */
export class CorsIoAdapter extends IoAdapter {
  private readonly allowedOrigins: string[];

  constructor(app: INestApplicationContext, configService: ConfigService) {
    super(app);
    const raw = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.allowedOrigins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.allowedOrigins,
        credentials: false,
      },
    });
  }
}
