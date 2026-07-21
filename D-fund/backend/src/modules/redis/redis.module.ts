import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const logger = new Logger('RedisModule');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Redis | null> => {
        const url = config.get<string>('REDIS_URL');
        if (!url) {
          logger.warn('REDIS_URL not set — falling back to in-memory storage');
          return null;
        }
        const client = new Redis(url, {
          lazyConnect: true,
          enableOfflineQueue: false,
          retryStrategy: (times: number) => Math.min(times * 200, 5000),
          connectTimeout: 3000,
          // P1 — timeout par commande : évite qu'un Redis dégradé bloque chaque requête HTTP
          commandTimeout: 5000,
        });
        client.on('error', (err: Error) => {
          logger.error(`Redis connection error: ${err.message}`);
        });
        try {
          await client.connect();
          logger.log('Redis connected');
          return client;
        } catch {
          logger.warn(`Redis unreachable at ${url} — falling back to in-memory storage`);
          client.disconnect();
          return null;
        }
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
