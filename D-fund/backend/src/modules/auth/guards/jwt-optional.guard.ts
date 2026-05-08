import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard — does NOT throw if no token is present.
 * Use on public routes that need to behave differently for authenticated users.
 */
@Injectable()
export class JwtOptionalGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    // Return user if authenticated, undefined if not — never throw
    return user || undefined;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
