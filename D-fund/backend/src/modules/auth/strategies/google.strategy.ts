import * as crypto from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientID || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set to use Google OAuth');
    }

    super({
      clientID,
      clientSecret,
      callbackURL: `${config.get<string>('BACKEND_URL') || 'http://localhost:3001'}/api/v1/auth/google/callback`,
      scope: ['email', 'profile'],
      // Passport génère et vérifie automatiquement le paramètre state anti-CSRF
      state: true,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id: googleId, emails, name, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error('No email from Google profile'), undefined);
    }

    // Find by googleId first, then by email
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (user) {
      if (user.isBanned) {
        return done(new UnauthorizedException('Account suspended'), undefined);
      }
      if (user.deletedAt) {
        return done(null, { oauthError: 'OAUTH_AUTH_REQUIRED' } as any);
      }
      // If the user registered with email/password and has no googleId, auto-linking
      // is a security risk: an attacker who controls a Google account with the same
      // email would silently take over the existing account.
      // Instead, signal the conflict so the controller can redirect to a clear error page.
      if (!user.googleId) {
        // Use a generic code — never confirm that an email/password account exists
        // for this email, which would allow harvesting of registered addresses.
        return done(null, { oauthError: 'OAUTH_AUTH_REQUIRED' } as any);
      }
    } else {
      try {
        const rawUnsubscribeToken = crypto.randomBytes(32).toString('hex');
        user = await this.prisma.user.create({
          data: {
            googleId,
            email,
            firstName: name?.givenName || '',
            lastName: name?.familyName || '',
            name: `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
            profilePic: photos?.[0]?.value || null,
            // Google has already verified the email — no need for a separate verification step
            isEmailVerified: true,
            // Required so email footers have a valid one-click unsubscribe link
            emailUnsubscribeToken: rawUnsubscribeToken,
            btoCProfile: { create: {} },
            notificationPreferences: { create: {} },
          },
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          user = await this.prisma.user.findFirst({ where: { OR: [{ googleId }, { email }] } });
          if (!user) return done(new Error('OAuth conflict'), undefined as any);
        } else {
          return done(e, undefined as any);
        }
      }
    }

    done(null, user);
  }
}
