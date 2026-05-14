import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

/**
 * Standard JWT authentication guard.
 *
 * Validates the JWT and populates the request user — nothing more.
 * Email-verification enforcement is intentionally NOT done here:
 * blocking every route for unverified users creates a whack-a-mole
 * problem as new routes are added. Instead the AppShell banner informs
 * the user and the resend-verification flow lets them fix it at their
 * own pace. If a specific route must require a verified email, add a
 * dedicated @UseGuards(EmailVerifiedGuard) on that route alone.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Reflector kept in constructor so the DI graph doesn't break for
  // consumers that inject JwtAuthGuard directly.
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    return super.handleRequest(err, user, info, context);
  }
}
