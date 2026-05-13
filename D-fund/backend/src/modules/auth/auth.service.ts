import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
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
   * Returns the SHA-256 hex digest of a token string.
   *
   * Raw tokens are sent to users (email links, unsubscribe footers) but NEVER
   * persisted. Only their hash is stored so a DB dump cannot be used to trigger
   * password resets or account takeovers.
   *
   * Lookup path: hash(input) → find in DB. Legacy plaintext tokens (pre-hash
   * migration) are handled by a fallback query so existing email links keep
   * working during the natural TTL window (max 24 h for verify/reset tokens;
   * longer for unsubscribe tokens which have a plaintext fallback permanently).
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

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
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const rawUnsubscribeToken  = crypto.randomBytes(32).toString('hex');

    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        name: dto.name || `${dto.firstName} ${dto.lastName}`,
        role: (dto.role as UserRole) || UserRole.USER,
        // Verification token hashed (high-security: prevents account takeover from DB dump)
        emailVerificationToken: this.hashToken(rawVerificationToken),
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 h
        // Unsubscribe token stored as-is: low-security, must be recoverable for email footers
        emailUnsubscribeToken: rawUnsubscribeToken,
        isEmailVerified: false,
        // Create sub-rows in the same transaction so new users can edit their profile
        // and receive notification preferences immediately after signup.
        btoCProfile: { create: {} },
        notificationPreferences: { create: {} },
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      select: USER_SAFE_SELECT,
    });
    const tokens = this.generateTokens(created.id, created.email);

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${rawVerificationToken}`;

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

    const expiry = { gt: new Date() };
    // Primary lookup by hash (new tokens). Fallback to plaintext for tokens
    // created before the hash migration (expire within 24 h naturally).
    let user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: this.hashToken(token), emailVerificationTokenExpiry: expiry },
    });
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { emailVerificationToken: token, emailVerificationTokenExpiry: expiry },
      });
    }

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

    const rawToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: this.hashToken(rawToken),
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${rawToken}`;

    // Fire-and-forget: une erreur Resend ne doit pas faire échouer la requête —
    // l'utilisateur peut demander un nouveau renvoi depuis l'interface.
    this.notificationsService.sendEmailVerification(user, verificationLink)
      .catch((err) => this.logger.error(`Failed to resend verification email: ${err.message}`));

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

    // Vérifier deletedAt avant bcrypt pour éviter la divulgation d'existence de compte
    if (raw.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (raw.isBanned) {
      throw new UnauthorizedException('Account suspended');
    }

    const isValid = await bcrypt.compare(dto.password, raw.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
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
  async validateUser(userId: string, tokenIssuedAt?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...USER_SAFE_SELECT, isBanned: true, deletedAt: true, passwordChangedAt: true },
    });

    if (!user) throw new UnauthorizedException();
    if (user.deletedAt) throw new UnauthorizedException('Account deleted');
    if (user.isBanned) throw new UnauthorizedException('Account suspended');

    // Reject tokens issued before the last password change (covers stolen tokens)
    if (tokenIssuedAt && user.passwordChangedAt) {
      const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (tokenIssuedAt < changedAtSec) {
        throw new UnauthorizedException('Session expired — please log in again');
      }
    }

    // Do not expose internal fields in the request context
    const { passwordChangedAt: _omit, deletedAt: _del, ...safeUser } = user;
    return safeUser;
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
   * - Atomic consumption: the token is marked as used in Redis BEFORE any other
   *   work is done, closing the TOCTOU window that existed between the old
   *   "check then blocklist" approach. Concurrent requests with the same token
   *   can no longer both generate fresh token pairs.
   * - Token rotation: each refresh token is single-use — once consumed it is
   *   permanently blocked for its remaining natural lifetime.
   *
   * @throws UnauthorizedException when the token is missing, already consumed,
   *         invalid, expired, or belongs to a banned / deleted user.
   */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) throw new UnauthorizedException('No refresh token provided');

    // Decode first (without verifying signature) to get the expiry claim for the TTL.
    const decoded = this.jwtService.decode(refreshToken) as { userId?: string; email?: string; exp?: number } | null;
    const exp = decoded?.exp;

    // Atomic consumption: SET the hash NX (only if not already set) with the
    // token's remaining lifetime as TTL. If the key already exists, a prior
    // request already consumed this token — reject immediately without revealing
    // whether it was logout or a replay attack.
    const consumed = await this.consumeRefreshTokenAtomically(refreshToken, exp);
    if (!consumed) {
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
        select: { id: true, email: true, isBanned: true, deletedAt: true },
      });
      if (!user) throw new UnauthorizedException('User not found');
      if (user.deletedAt) throw new UnauthorizedException('Account deleted');
      if (user.isBanned) throw new UnauthorizedException('Account suspended');

      return this.generateTokens(user.id, user.email);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ─── Refresh token blocklist ─────────────────────────────────────────────────

  /**
   * Atomically marks a refresh token as consumed using Redis SET NX EX.
   *
   * Returns true  → token was not previously consumed; caller may proceed.
   * Returns false → token was already in the blocklist (replay or prior logout).
   *
   * The key is a SHA-256 hash of the raw token to avoid persisting credentials.
   *
   * Fail behaviour:
   * - No Redis / dev: fail-open (return true) — token rotation is best-effort
   *   without a shared store.
   * - Redis unreachable in production: fail-closed (throw 503) so a revoked
   *   token cannot slip through during a Redis outage.
   */
  private async consumeRefreshTokenAtomically(token: string, expClaim?: number): Promise<boolean> {
    if (!this.redis) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Auth service temporarily unavailable — please retry',
        );
      }
      return true; // dev/test without Redis: accept all tokens
    }

    try {
      const ttl = expClaim
        ? expClaim - Math.floor(Date.now() / 1000)
        : 7 * 24 * 60 * 60; // fallback: 7 days (max refresh token lifetime)

      if (ttl <= 0) return false; // token already expired — treat as consumed

      const hash = crypto.createHash('sha256').update(token).digest('hex');
      // SET key 1 EX ttl NX: returns 'OK' if the key was set (token not yet seen)
      // or null if the key already existed (token was already consumed or revoked).
      const result = await this.redis.set(`blocklist:rt:${hash}`, '1', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Auth service temporarily unavailable — please retry',
        );
      }
      return true; // dev/test: Redis error → fail-open
    }
  }

  /**
   * Adds a refresh token to the Redis blocklist until it naturally expires.
   * Used by logout to immediately revoke the current refresh token.
   *
   * No-ops silently when Redis is not configured — clearing the HttpOnly cookie
   * is still the primary defence in that case.
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
      // Use SET (not NX) for logout — we want to overwrite even if somehow already set
      await this.redis.set(`blocklist:rt:${hash}`, '1', 'EX', ttl);
    } catch (err) {
      // Non-fatal: log and continue — cookie has already been cleared
      this.logger.warn(`Failed to blocklist refresh token: ${err.message}`);
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
   * Uses Redis when available, in-memory Map otherwise (dev only).
   *
   * @throws InternalServerErrorException in production when Redis is not configured.
   */
  async generateOAuthCode(token: string): Promise<string> {
    const code = crypto.randomBytes(32).toString('hex');

    if (this.redis) {
      await this.redis.set(`oauth:${code}`, token, 'EX', 60);
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new InternalServerErrorException('Redis is required for OAuth in production');
      }
      this.oauthCodesMap.set(code, { token, expiresAt: Date.now() + 60_000 });
    }

    return code;
  }

  /**
   * Exchanges a one-time OAuth code for its JWT.
   * The code is deleted atomically on first use (single-use guarantee).
   *
   * @throws UnauthorizedException when the code is missing, unknown, or expired.
   * @throws InternalServerErrorException in production when Redis is not configured.
   */
  async exchangeOAuthCode(code: string): Promise<string> {
    if (this.redis) {
      // GETDEL: atomic read-and-delete — prevents any replay window
      const token = await this.redis.getdel(`oauth:${code}`);
      if (!token) throw new UnauthorizedException('Invalid or expired OAuth code');
      return token;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException('Redis is required for OAuth in production');
    }

    // In-memory fallback (local dev only)
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

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: this.hashToken(rawToken), passwordResetExpiry: expiry },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

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
    const expiry = { gt: new Date() };
    // Primary lookup by hash. Fallback to plaintext for tokens issued before
    // the hash migration (they expire within 1 h).
    let user = await this.prisma.user.findFirst({
      where: { passwordResetToken: this.hashToken(token), passwordResetExpiry: expiry },
    });
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { passwordResetToken: token, passwordResetExpiry: expiry },
      });
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    // passwordChangedAt invalidates all JWTs issued before this moment,
    // forcing every session (incl. stolen tokens) to re-authenticate.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpiry: null,
        passwordChangedAt: now,
      },
    });

    // Non-blocking: send security notification email
    try {
      await this.notificationsService.sendPasswordChangedEmail(user);
    } catch (err) {
      this.logger.error(`Failed to send password-changed notification: ${err.message}`);
    }

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

    // Primary lookup by hash. Permanent plaintext fallback for unsubscribe tokens
    // since old email footers in users' inboxes may contain pre-hash tokens.
    let user = await this.prisma.user.findFirst({
      where: { emailUnsubscribeToken: this.hashToken(token) },
    });
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { emailUnsubscribeToken: token },
      });
      // Opportunistically upgrade the stored token to its hash on first use
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { emailUnsubscribeToken: this.hashToken(token) },
        }).catch(() => undefined);
      }
    }

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
