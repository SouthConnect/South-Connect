import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RegisterDto, LoginDto } from './dto';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

/**
 * Fields returned to callers. Explicitly excludes all security-sensitive columns:
 * password, emailVerificationToken, passwordResetToken, passwordResetExpiry, googleId.
 */
const USER_SAFE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  name: true,
  role: true,
  bio: true,
  profilePic: true,
  headerImage: true,
  phone: true,
  city: true,
  country: true,
  linkedinUrl: true,
  website: true,
  visibility: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);

  onModuleDestroy() {
    clearInterval(this.oauthCleanupInterval as unknown as ReturnType<typeof setInterval>);
  }

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
    private config: ConfigService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  /**
   * Creates a new user account.
   *
   * A cryptographic email-verification token is generated and sent via email
   * as a fire-and-forget operation so the HTTP response is not delayed.
   *
   * @throws ConflictException when the email address is already registered.
   */
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('An account with this email address already exists.');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');

    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        name: dto.name || `${dto.firstName} ${dto.lastName}`,
        role: (dto.role as UserRole) || UserRole.USER,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 h
        emailUnsubscribeToken: unsubscribeToken,
        isEmailVerified: false,
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      select: USER_SAFE_SELECT,
    });
    const tokens = this.generateTokens(created.id, created.email);

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    // Fire-and-forget: does not block the registration response
    this.notificationsService.sendEmailVerification(created, verificationLink)
      .catch((err) => this.logger.error(`Failed to send verification email: ${err.message}`));

    return { user, ...tokens };
  }

  /**
   * Marks an account's email as verified using the one-time token sent during registration.
   *
   * @throws BadRequestException when the token is missing, invalid, or already consumed.
   */
  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is missing.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: { gt: new Date() }, // reject expired tokens
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification link.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });

    return { message: 'Email vérifié avec succès.' };
  }

  /**
   * Generates and sends a new email verification token for the given user.
   * Returns an informational message (not an error) when the email is already verified.
   */
  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found.');
    if (user.isEmailVerified) return { message: 'Email déjà vérifié.' };

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
    await this.notificationsService.sendEmailVerification(user, verificationLink);
    return { message: 'Email de vérification renvoyé.' };
  }

  /**
   * Authenticates a user with email and password.
   *
   * @throws UnauthorizedException for any credential mismatch (generic message to prevent enumeration).
   */
  async login(dto: LoginDto) {
    const raw = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!raw || !raw.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, raw.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (raw.isBanned) {
      throw new UnauthorizedException('Account suspended');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: raw.id },
      select: USER_SAFE_SELECT,
    });
    const tokens = this.generateTokens(raw.id, raw.email);

    return { user, ...tokens };
  }

  /**
   * Validates a JWT payload by loading the matching user record.
   * Used internally by JwtStrategy.
   *
   * @throws UnauthorizedException when no user matches the given ID.
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...USER_SAFE_SELECT, isBanned: true },
    });

    if (!user) throw new UnauthorizedException();
    if (user.isBanned) throw new UnauthorizedException('Account suspended');

    return user;
  }

  /**
   * Generates a short-lived access token (15 min) and a long-lived refresh
   * token (7 days) for the given user.
   *
   * The refresh token is signed with a separate secret
   * (REFRESH_TOKEN_SECRET or JWT_SECRET + '_refresh') so that a stolen
   * refresh token cannot be used to forge access tokens.
   */
  generateTokens(userId: string, email: string): { accessToken: string; refreshToken: string } {
    const accessToken = this.jwtService.sign({ userId, email }, { expiresIn: '15m' });

    const refreshSecret =
      this.config.get<string>('REFRESH_TOKEN_SECRET') ??
      (this.config.get<string>('JWT_SECRET')! + '_refresh');
    const refreshToken = this.jwtService.sign(
      { userId, email },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Validates a refresh token and issues a fresh pair of tokens.
   *
   * Security properties:
   * - Blocklist check: rejects any token that was previously revoked (via logout)
   * - Token rotation: the consumed refresh token is immediately blocklisted so
   *   it cannot be replayed even if an attacker captured it
   *
   * @throws UnauthorizedException when the token is missing, revoked, invalid, or expired.
   */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) throw new UnauthorizedException('No refresh token provided');

    // Reject tokens that have been explicitly revoked (logout or previous rotation)
    if (await this.isRefreshTokenBlocked(refreshToken)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      const refreshSecret =
        this.config.get<string>('REFRESH_TOKEN_SECRET') ??
        (this.config.get<string>('JWT_SECRET')! + '_refresh');
      const payload = this.jwtService.verify<{ userId: string; email: string; exp: number }>(
        refreshToken,
        { secret: refreshSecret },
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, isBanned: true },
      });
      if (!user) throw new UnauthorizedException('User not found');
      if (user.isBanned) throw new UnauthorizedException('Account suspended');

      // Blocklist the consumed token (rotation — prevents replay of captured tokens)
      await this.invalidateRefreshToken(refreshToken, payload.exp);

      return this.generateTokens(user.id, user.email);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ─── Refresh token blocklist ─────────────────────────────────────────────────

  /**
   * Adds a refresh token to the Redis blocklist until it naturally expires.
   * The key is a SHA-256 hash of the raw token to avoid storing credentials.
   *
   * No-ops silently when Redis is not configured — clearing the HttpOnly cookie
   * is still the primary defence in that case.
   *
   * @param token    - The raw refresh token JWT.
   * @param expClaim - The `exp` claim from the token payload (Unix timestamp).
   *                   When omitted the token is decoded on-the-fly.
   */
  async invalidateRefreshToken(token: string, expClaim?: number): Promise<void> {
    if (!this.redis || !token) return;

    try {
      let exp = expClaim;
      if (!exp) {
        const decoded = this.jwtService.decode(token) as { exp?: number } | null;
        exp = decoded?.exp;
      }
      if (!exp) return;

      const ttl = exp - Math.floor(Date.now() / 1000);
      if (ttl <= 0) return; // already expired — nothing to blocklist

      const hash = crypto.createHash('sha256').update(token).digest('hex');
      await this.redis.set(`blocklist:rt:${hash}`, '1', 'EX', ttl);
    } catch (err) {
      // Non-fatal: log and continue — cookie has already been cleared
      this.logger.warn(`Failed to blocklist refresh token: ${err.message}`);
    }
  }

  /**
   * Returns true when the token is present in the Redis blocklist.
   *
   * Fail behaviour:
   * - Dev / test (no Redis): fail-open (return false) for convenience.
   * - Production (Redis configured but unreachable): fail-closed — throw 503 so
   *   the client retries rather than letting a revoked token through.
   */
  private async isRefreshTokenBlocked(token: string): Promise<boolean> {
    if (!this.redis) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Auth service temporarily unavailable — please retry',
        );
      }
      return false; // dev/test: no Redis, accept tokens
    }
    try {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      return (await this.redis.exists(`blocklist:rt:${hash}`)) === 1;
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Auth service temporarily unavailable — please retry',
        );
      }
      return false;
    }
  }

  // ─── OAuth one-time codes ────────────────────────────────────────────────────
  //
  // When Redis is available: codes are stored with a native TTL (EX 60) and
  // consumed atomically with GETDEL — survives restarts and works across
  // multiple instances.
  //
  // When Redis is absent (local dev without REDIS_URL): falls back to an
  // in-memory Map with a 5-minute cleanup interval. Codes are still single-use
  // and expire after 60 seconds; the only limitation is that the store is
  // process-local.

  /** Fallback in-memory store used when Redis is not configured. */
  private readonly oauthCodesMap = new Map<string, { token: string; expiresAt: number }>();
  private readonly oauthCleanupInterval = setInterval(() => {
    if (this.redis) return; // Redis is handling TTL — nothing to do
    const now = Date.now();
    for (const [code, entry] of this.oauthCodesMap) {
      if (entry.expiresAt < now) this.oauthCodesMap.delete(code);
    }
  }, 5 * 60 * 1000).unref(); // .unref() so the timer never prevents Node.js from exiting

  /**
   * Stores a one-time OAuth code → JWT mapping with a 60-second TTL.
   * Uses Redis when available, in-memory Map otherwise.
   */
  async generateOAuthCode(token: string): Promise<string> {
    const code = crypto.randomBytes(32).toString('hex');

    if (this.redis) {
      await this.redis.set(`oauth:${code}`, token, 'EX', 60);
    } else {
      this.oauthCodesMap.set(code, { token, expiresAt: Date.now() + 60_000 });
    }

    return code;
  }

  /**
   * Exchanges a one-time OAuth code for its JWT.
   * The code is deleted atomically on first use (single-use guarantee).
   *
   * @throws UnauthorizedException when the code is missing, unknown, or expired.
   */
  async exchangeOAuthCode(code: string): Promise<string> {
    if (this.redis) {
      // GETDEL: atomic read-and-delete — prevents any replay window
      const token = await this.redis.getdel(`oauth:${code}`);
      if (!token) throw new UnauthorizedException('Invalid or expired OAuth code');
      return token;
    }

    // In-memory fallback
    const entry = this.oauthCodesMap.get(code);
    this.oauthCodesMap.delete(code); // always delete, even on failure
    if (!entry || entry.expiresAt < Date.now()) {
      throw new UnauthorizedException('Invalid or expired OAuth code');
    }
    return entry.token;
  }

  /**
   * Initiates a password-reset flow by generating a short-lived token (1 hour)
   * and sending a reset link by email.
   *
   * Always returns a success response even for unknown emails to prevent user enumeration.
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) return { message: 'If this email exists, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.notificationsService.sendPasswordResetEmail(user, resetLink);
    } catch (err) {
      this.logger.error(`Failed to send password reset email: ${err.message}`);
    }

    return { message: 'If this email exists, a reset link has been sent.' };
  }

  /**
   * Finalises a password reset by validating the token and persisting the new hashed password.
   *
   * @throws BadRequestException when the token is invalid or has expired.
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordResetToken: null, passwordResetExpiry: null },
    });

    return { message: 'Password updated successfully.' };
  }

  /**
   * Opts a user out of marketing/notification emails using their unsubscribe token.
   * The token never expires and requires no authentication — it is embedded in every
   * email footer so recipients can unsubscribe in one click.
   *
   * @throws BadRequestException when the token is absent or unknown.
   */
  async unsubscribeEmail(token: string) {
    if (!token) throw new BadRequestException('Token de désabonnement manquant.');

    const user = await this.prisma.user.findFirst({
      where: { emailUnsubscribeToken: token },
    });

    if (!user) throw new BadRequestException('Lien de désabonnement invalide.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailOptOut: true },
    });

    return { message: 'Vous avez bien été désabonné des emails D-Fund.' };
  }

  /**
   * Re-subscribes a user to emails (called from authenticated profile settings).
   *
   * @throws BadRequestException when the user does not exist.
   */
  async resubscribeEmail(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailOptOut: false },
    });

    return { message: 'Vous êtes de nouveau abonné aux emails D-Fund.' };
  }
}
