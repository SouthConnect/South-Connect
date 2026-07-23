-- Indexes on users table to speed up soft-delete filters, admin queries, and ban checks.
-- Note: CONCURRENTLY removed — Prisma wraps migrations in a transaction and PostgreSQL
-- forbids CONCURRENTLY inside a transaction block.

CREATE INDEX IF NOT EXISTS "users_deletedAt_idx"
  ON "users"("deletedAt");

CREATE INDEX IF NOT EXISTS "users_role_deletedAt_idx"
  ON "users"("role", "deletedAt");

CREATE INDEX IF NOT EXISTS "users_isBanned_deletedAt_idx"
  ON "users"("isBanned", "deletedAt");
