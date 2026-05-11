-- Migration: add soft-delete support to users
-- deletedAt = NULL means the account is active; non-NULL means it was deleted.
-- All queries filtering active users must add WHERE "deletedAt" IS NULL.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
