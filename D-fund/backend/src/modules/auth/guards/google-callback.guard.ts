import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Overrides the default failure behaviour of AuthGuard('google') on the
 * callback route.  When Passport fails (state/CSRF mismatch, expired code,
 * network error to Google…) the default guard throws UnauthorizedException,
 * which NestJS renders as a raw JSON 401 in the browser.
 *
 * Instead, we return an oauthError marker so the controller can redirect
 * the user to /login?error=OAUTH_FAILED — the same graceful flow already
 * used for EMAIL_EXISTS_DIFFERENT_METHOD and account-suspended cases.
 */
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      return { oauthError: 'OAUTH_FAILED' } as any;
    }
    return user;
  }
}
