/**
 * Wraps a per-route @Throttle() limit so it's neutralized in the test
 * environment, the same way the global 'default' profile already is
 * (see ThrottlerModule.forRootAsync in app.module.ts).
 *
 * @Throttle({ default: { limit: X, ttl } }) is a literal override that always
 * wins over the profile's own limit — so a route using a bare number here
 * would stay throttled even under NODE_ENV=test, silently reintroducing the
 * exact flakiness (e2e tests hitting real 429s) this module was built to
 * eliminate. Every per-route limit must go through this helper.
 */
export function rateLimit(limit: number): number {
  return process.env.NODE_ENV === 'test' ? 10_000 : limit;
}
