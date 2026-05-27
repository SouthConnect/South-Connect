import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { SKIP_EMAIL_VERIFICATION_KEY } from '../../../common/decorators/skip-email-verification.decorator';

/**
 * Standard JWT authentication guard.
 *
 * Validates the JWT, then blocks unverified users unless the route (or its
 * controller class) is decorated with @SkipEmailVerification().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const resolved = super.handleRequest(err, user, info, context);

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_EMAIL_VERIFICATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!skip && resolved?.isEmailVerified === false) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    }

    return resolved;
  }
}
