-- DropIndex
DROP INDEX "private_discussions_lastMessageAt_idx";

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "attachmentUrl" TEXT;

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailApplicationSubmitted" BOOLEAN NOT NULL DEFAULT true,
    "emailApplicationReviewed" BOOLEAN NOT NULL DEFAULT true,
    "emailApplicationAccepted" BOOLEAN NOT NULL DEFAULT true,
    "emailOpportunityApproved" BOOLEAN NOT NULL DEFAULT true,
    "emailNewMessage" BOOLEAN NOT NULL DEFAULT true,
    "emailNewFollower" BOOLEAN NOT NULL DEFAULT true,
    "inAppApplicationSubmitted" BOOLEAN NOT NULL DEFAULT true,
    "inAppApplicationReviewed" BOOLEAN NOT NULL DEFAULT true,
    "inAppApplicationAccepted" BOOLEAN NOT NULL DEFAULT true,
    "inAppOpportunityApproved" BOOLEAN NOT NULL DEFAULT true,
    "inAppNewMessage" BOOLEAN NOT NULL DEFAULT true,
    "inAppNewFollower" BOOLEAN NOT NULL DEFAULT true,
    "emailOpportunityRejected" BOOLEAN NOT NULL DEFAULT true,
    "inAppOpportunityRejected" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "applications_opportunityId_stage_idx" ON "applications"("opportunityId", "stage");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "opportunities_ownerId_status_idx" ON "opportunities"("ownerId", "status");

-- CreateIndex
CREATE INDEX "opportunities_status_createdAt_idx" ON "opportunities"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "opportunities_trendingScore_idx" ON "opportunities"("trendingScore" DESC);

-- CreateIndex
CREATE INDEX "private_discussions_lastMessageAt_idx" ON "private_discussions"("lastMessageAt");

-- CreateIndex
CREATE INDEX "referral_codes_ownerId_status_idx" ON "referral_codes"("ownerId", "status");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

