import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

/** Extracts the JWT from the HttpOnly access_token cookie. */
const fromCookie = (req: Request): string | null =>
  (req?.cookies as Record<string, string> | undefined)?.['access_token'] ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET is not configured. Please set it in your environment variables.',
      );
    }

    super({
      // Try cookie first (browser clients), fall back to Bearer header (Swagger / API clients)
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.userId, payload.iat);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

