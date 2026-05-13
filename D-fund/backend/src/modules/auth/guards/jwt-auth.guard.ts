import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { SKIP_EMAIL_VERIFICATION_KEY } from '../.././../common/decorators/skip-email-verification.decorator';

/**
 * Standard JWT authentication guard.
 *
 * In addition to validating the JWT it enforces email verification:
 * any authenticated user whose email is not yet confirmed receives a 403
 * unless the route is decorated with @SkipEmailVerification().
 *
 * Routes that must stay accessible before verification:
 *   GET  /auth/me                  — needed to show the "verify your email" banner
 *   POST /auth/resend-verification — literally used to trigger verification
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Let passport handle auth errors and missing tokens
    const authenticatedUser = super.handleRequest(err, user, info, context);

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!skip && authenticatedUser && !authenticatedUser.isEmailVerified) {
      throw new ForbiddenException(
        'Veuillez vérifier votre adresse email pour accéder à cette fonctionnalité.',
      );
    }

    return authenticatedUser;
  }
}
