-- Migration: add passwordChangedAt to users
-- Tokens issued before this timestamp are rejected, enabling session invalidation
-- on password reset without tracking individual tokens.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
