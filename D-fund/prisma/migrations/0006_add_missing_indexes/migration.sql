-- Migration: add missing indexes for social and participant tables

-- Participant: lookups by userId (get all discussions for a user) and by discussionId
CREATE INDEX IF NOT EXISTS "participants_userId_idx" ON "participants"("userId");
CREATE INDEX IF NOT EXISTS "participants_discussionId_idx" ON "participants"("discussionId");

-- SavedOpportunity: lookups by userId and by opportunityId
CREATE INDEX IF NOT EXISTS "saved_opportunities_userId_idx" ON "saved_opportunities"("userId");
CREATE INDEX IF NOT EXISTS "saved_opportunities_opportunityId_idx" ON "saved_opportunities"("opportunityId");

-- LikedOpportunity: lookups by userId and by opportunityId
CREATE INDEX IF NOT EXISTS "liked_opportunities_userId_idx" ON "liked_opportunities"("userId");
CREATE INDEX IF NOT EXISTS "liked_opportunities_opportunityId_idx" ON "liked_opportunities"("opportunityId");
