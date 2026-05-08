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
      // Link googleId if not set yet
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }
    } else {
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
        },
      });
    }

    done(null, user);
  }
}
