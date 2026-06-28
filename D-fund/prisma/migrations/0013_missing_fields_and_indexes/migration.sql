-- C1: Add emailOptOut and emailUnsubscribeToken to users (present in schema but missing from migrations)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailOptOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailUnsubscribeToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_emailUnsubscribeToken_key" ON "users"("emailUnsubscribeToken");

-- M5: Composite indexes for Application — improves deletedAt filter queries
CREATE INDEX IF NOT EXISTS "applications_candidateId_deletedAt_idx" ON "applications"("candidateId", "deletedAt");
CREATE INDEX IF NOT EXISTS "applications_opportunityId_deletedAt_idx" ON "applications"("opportunityId", "deletedAt");

-- M6: Index on PublicDiscussion.lastMessageAt for ORDER BY queries
CREATE INDEX IF NOT EXISTS "public_discussions_lastMessageAt_idx" ON "public_discussions"("lastMessageAt" DESC);
