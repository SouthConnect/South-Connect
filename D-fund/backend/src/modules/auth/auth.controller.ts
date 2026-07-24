import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GoogleCallbackGuard } from './guards/google-callback.guard';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ResetPasswordDto, ForgotPasswordDto, ChangePasswordDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipEmailVerification } from '../../common/decorators/skip-email-verification.decorator';

/**
 * Handles all authentication flows: registration, login, OAuth, email
 * verification, and password reset.
 *
 * Tokens are delivered via HttpOnly cookies (not JSON body) so that
 * JavaScript running in the browser can never read them — including any
 * injected XSS payload.  Swagger / API clients may still pass a Bearer
 * token in the Authorization header as a fallback (see JwtStrategy).
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  // ─── Cookie helpers ──────────────────────────────────────────────────────────

  /**
   * Sets the access_token and refresh_token HttpOnly cookies on the response.
   *
   * - access_token : 15-minute TTL, sent on every request to /api/v1/**
   * - refresh_token: 7-day TTL, scoped to /api/v1/auth/refresh only
   *   so it is NOT sent to every endpoint (minimises exposure).
   */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const cookieDomain = this.config.get<string>('COOKIE_DOMAIN');
    const base = {
      httpOnly: true,
      secure: isProd,
      // lax (not strict) required for OAuth: after the Google→backend→frontend redirect chain,
      // the browser must send the cookie on the /auth/me fetch from southconnect.io to api.southconnect.io.
      // strict blocks this because browsers see it as a cross-site navigation despite same eTLD+1.
      sameSite: 'lax' as const,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    res.cookie('access_token', accessToken, {
      ...base,
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.cookie('refresh_token', refreshToken, {
      ...base,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth/refresh',      // scoped — not sent to other endpoints
    });

    // Non-sensitive flag cookie readable by the Next.js Edge middleware (not HttpOnly).
    // Survives the 15-min access_token window so the middleware knows a valid refresh_token
    // may still exist and passes the request through instead of hard-redirecting to /login.
    res.cookie('session_hint', '1', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — matches refresh_token TTL
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
  }

  /** Clears both auth cookies (used on logout). */
  private clearAuthCookies(res: Response) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const cookieDomain = this.config.get<string>('COOKIE_DOMAIN');
    const base = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };
    res.clearCookie('access_token', base);
    res.clearCookie('refresh_token', { ...base, path: '/api/v1/auth/refresh' });
    res.clearCookie('session_hint', { ...base, httpOnly: false });
  }

  // ─── Registration & Login ────────────────────────────────────────────────────

  /** Registers a new user account. Rate-limited to 5 requests per minute. */
  @ApiOperation({ summary: 'Register a new account' })
  @Post('register')
  @Throttle({ auth: {} })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.register(dto);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  /** Authenticates a user and sets HttpOnly auth cookies. Rate-limited to 5 per minute. */
  @ApiOperation({ summary: 'Login and receive HttpOnly auth cookies' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: {} })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  /**
   * Returns the authenticated user's profile.
   * Accessible even when email is not yet verified — needed to display
   * the "verify your email" banner on the frontend.
   */
  @ApiOperation({ summary: "Return the current user's profile" })
  @ApiBearerAuth('JWT')
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  me(@CurrentUser() user: User) {
    return user;
  }

  // ─── Token refresh & logout ──────────────────────────────────────────────────

  /**
   * Issues a fresh access_token + refresh_token pair using the refresh_token cookie.
   * Implements token rotation: the old refresh token is invalidated on each use.
   * Rate-limited on its own `refresh` profile (20/min) — separate from `auth`
   * (login/register) so legitimate multi-tab wake-up bursts don't compete with
   * brute-force protection on credential-based endpoints.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ refresh: {} })
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string = req.cookies?.['refresh_token'] ?? '';
    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Tokens refreshed.' };
  }

  /**
   * Ends the session by:
   * 1. Adding the refresh token to the Redis blocklist (server-side revocation)
   * 2. Clearing both HttpOnly cookies from the browser
   *
   * After logout, the refresh token is permanently rejected even if an attacker
   * had captured a copy of it — it will never produce new tokens.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string = req.cookies?.['refresh_token'] ?? '';
    await this.authService.invalidateRefreshToken(refreshToken);
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully.' };
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────────

  /** Initiates the Google OAuth2 redirect flow. */
  @Get('google')
  @Throttle({ auth: {} })
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects to Google — no response body needed
  }

  /**
   * OAuth callback: sets HttpOnly auth cookies and redirects to the frontend.
   * The JWT is never exposed in the redirect URL or browser history.
   */
  @Get('google/callback')
  @Throttle({ auth: {} })
  @UseGuards(GoogleCallbackGuard)
  googleCallback(@Req() req: any, @Res() res: Response) {
    const frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').split(',')[0].trim();

    // Strategy signals a conflict: an account with this email exists but uses
    // email/password auth. Redirect to login with an explicit error code so
    // the user can connect their account intentionally.
    if (req.user?.oauthError) {
      const safeError = encodeURIComponent(String(req.user.oauthError).slice(0, 50));
      return res.redirect(`${frontendUrl}/login?error=${safeError}`);
    }

    if (req.user?.isBanned) return res.redirect(`${frontendUrl}/login?error=account_suspended`);
    if (req.user?.deletedAt) return res.redirect(`${frontendUrl}/login?error=account_deleted`);

    const { accessToken, refreshToken } = this.authService.generateTokens(
      req.user.id,
      req.user.email,
      req.user.role,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    return res.redirect(`${frontendUrl}/auth/google/success`);
  }

  // ─── Email verification ───────────────────────────────────────────────────────

  /** Verifies an email address using the one-time token sent during registration. */
  @ApiOperation({ summary: 'Verify email address with one-time token' })
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: {} })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  /** Re-sends the verification email. Accessible before email verification. */
  @ApiOperation({ summary: 'Re-send email verification link' })
  @ApiBearerAuth('JWT')
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: {} })
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  resendVerification(@CurrentUser() user: User) {
    return this.authService.resendVerification(user.id);
  }

  // ─── Password reset ───────────────────────────────────────────────────────────

  /** Sends a password-reset link to the provided email address. Rate-limited to 3 per minute. */
  @ApiOperation({ summary: 'Request a password-reset email' })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: {} })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /** Resets a user's password using a valid reset token. Rate-limited to 5 per minute. */
  @ApiOperation({ summary: 'Reset password with a valid token' })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: {} })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // ─── Email preferences ────────────────────────────────────────────────────────

  /**
   * Opt out of marketing/notification emails using the token embedded in every email footer.
   * No authentication required — token is submitted via POST body to avoid GET caching / prefetch.
   */
  @ApiOperation({ summary: 'Unsubscribe from emails using footer token' })
  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: {} })
  unsubscribeEmail(@Body('token') token: string) {
    return this.authService.unsubscribeEmail(token);
  }

  /** Re-subscribes the authenticated user to emails (called from profile settings). */
  @ApiOperation({ summary: 'Re-subscribe to email notifications' })
  @ApiBearerAuth('JWT')
  @Post('resubscribe')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  resubscribeEmail(@CurrentUser() user: User) {
    return this.authService.resubscribeEmail(user.id);
  }

  /** Changes the authenticated user's password (requires current password). */
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiBearerAuth('JWT')
  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: {} })
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
