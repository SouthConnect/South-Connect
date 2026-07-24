import { ForbiddenException } from '@nestjs/common';

/**
 * Throws ForbiddenException unless `actualUserId` matches `expectedUserId`.
 *
 * A thin, shared wrapper around the equality check ("is this caller the
 * resource owner / the candidate / etc.") that was previously duplicated,
 * with the same logic, across several services and controllers.
 *
 * Deliberately generic (not opportunity-specific): the same shape of check
 * protects several different resources (opportunity ownership, application
 * ownership...). Keeping call sites' own existence checks and exact wording
 * separate — this only replaces the identity comparison itself.
 */
export function assertSameUser(
  expectedUserId: string,
  actualUserId: string,
  message: string,
): void {
  if (expectedUserId !== actualUserId) {
    throw new ForbiddenException(message);
  }
}
