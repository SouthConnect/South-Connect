-- Migration: supplemental indexes for Rating, Message, ReferralCode, AdminAuditLog

-- Rating: fast lookups by userId
CREATE INDEX IF NOT EXISTS "ratings_userId_idx" ON "ratings"("userId");

-- Message: compound index for "last N messages from user X"
CREATE INDEX IF NOT EXISTS "messages_senderId_createdAt_idx" ON "messages"("senderId", "createdAt" DESC);

-- ReferralCode: cron filters by createdAt; compound for "codes by owner since date"
CREATE INDEX IF NOT EXISTS "referral_codes_createdAt_idx" ON "referral_codes"("createdAt");
CREATE INDEX IF NOT EXISTS "referral_codes_ownerId_createdAt_idx" ON "referral_codes"("ownerId", "createdAt" DESC);

-- AdminAuditLog: "all actions on entity X of type Y"
CREATE INDEX IF NOT EXISTS "admin_audit_logs_targetId_targetType_idx" ON "admin_audit_logs"("targetId", "targetType");
