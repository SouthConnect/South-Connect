import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error(
            'JWT_SECRET is not configured. Please set it in your environment variables.',
          );
        }
        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
    UsersModule,
    NotificationsModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: GoogleStrategy,
      useFactory: (config: ConfigService, prisma: PrismaService) => {
        const clientID = config.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');
        if (!clientID || !clientSecret) {
          return null; // Google OAuth non configuré, on skip silencieusement
        }
        return new GoogleStrategy(config, prisma);
      },
      inject: [ConfigService, PrismaService],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
