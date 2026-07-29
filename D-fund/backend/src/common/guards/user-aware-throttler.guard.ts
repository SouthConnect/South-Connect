import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';

/**
 * Rate-limits by authenticated user when possible, falling back to IP for
 * anonymous requests.
 *
 * The default @nestjs/throttler tracker is IP-only, which means every device
 * behind the same public IP (a household's phone + laptop, a CGNAT-shared
 * mobile carrier IP — the norm for this app's target audience) shares ONE
 * budget per route. One user's traffic can lock out everyone else on that IP.
 *
 * Verifying the access_token cookie here (signature + expiry only, no DB hit)
 * gives each authenticated user their own bucket regardless of which device
 * or network they're on. Pre-auth routes (login, OAuth) have no user yet and
 * necessarily stay IP-based — see the `auth`/`oauth` throttle profiles for
 * how those are tuned instead.
 */
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const token = req.cookies?.['access_token'];
    if (token) {
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        if (payload?.userId) return `user:${payload.userId}`;
      } catch {
        // Invalid/expired token — fall back to IP tracking below.
      }
    }
    return `ip:${req.ip}`;
  }
}
