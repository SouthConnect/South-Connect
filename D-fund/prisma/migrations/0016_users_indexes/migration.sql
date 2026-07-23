-- Indexes on users table to speed up soft-delete filters, admin queries, and ban checks.
-- deletedAt is NULL in >99% of rows; a partial index would be ideal but Prisma ORM
-- does not support partial index syntax, so we use a full B-tree index instead.
-- PostgreSQL will still skip it efficiently via bitmap index scans on filtered queries.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_deletedAt_idx"
  ON "users"("deletedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_role_deletedAt_idx"
  ON "users"("role", "deletedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_isBanned_deletedAt_idx"
  ON "users"("isBanned", "deletedAt");
