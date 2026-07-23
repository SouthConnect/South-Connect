-- Add soft-delete support to Opportunity.
-- Hard DELETE with CASCADE was permanent and unrecoverable.
-- deletedAt = NULL means active; non-null means logically deleted.
-- No CONCURRENTLY — Prisma wraps migrations in a transaction.

ALTER TABLE "opportunities" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "opportunities_deletedAt_idx" ON "opportunities"("deletedAt");
