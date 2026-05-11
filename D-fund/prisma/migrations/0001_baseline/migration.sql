-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('JOB_OPPORTUNITY', 'TALENT_PROFILE', 'CO_FOUNDER_OPPORTUNITY', 'CO_FOUNDER_PROFILE', 'BUSINESS_IDEA', 'SUPPORT_OFFER', 'SERVICE_LISTING', 'SERVICE_REQUEST', 'DEAL_FLOW', 'INVESTOR_THESIS', 'INVESTOR_PROFILE', 'FUNDING_OPPORTUNITY', 'EVENT', 'CALL_FOR_STARTUPS', 'MENTORSHIP_BA_OFFER', 'PROJECT_SEEKING_SUPPORT', 'VENTURE_PROGRAM', 'CHILL_WORK_SPOT', 'MARKET_ADVISOR');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'ARCHIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('DRAFT', 'SUBMITTED', 'OWNER_REVIEW', 'READY_TO_SUBMIT', 'SUCCESS', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DiscussionType" AS ENUM ('OPEN_FORUM', 'OPPORTUNITY_RELATED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'WORKING_ON_IT', 'IDEA', 'DONE');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('NEW_USER', 'TALENT_HUNT', 'OPPORTUNITY_RELATED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "bio" TEXT,
    "profilePic" TEXT,
    "headerImage" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "country" TEXT,
    "linkedinUrl" TEXT,
    "website" TEXT,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "googleId" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bto_c_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "industries" TEXT[],
    "marketFocus" TEXT[],
    "languages" TEXT[],
    "businessSkills" TEXT[],
    "techSkills" TEXT[],
    "seniorityLevel" TEXT,
    "opportunitiesCount" INTEGER NOT NULL DEFAULT 0,
    "activeOpportunitiesCount" INTEGER NOT NULL DEFAULT 0,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "roundedRating" INTEGER,
    "profileSharedCount" INTEGER NOT NULL DEFAULT 0,
    "lookingForOpportunities" BOOLEAN NOT NULL DEFAULT true,
    "remote" BOOLEAN,
    "countries" TEXT[],
    "regions" TEXT[],
    "opportunityTypes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bto_c_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bto_b_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "logo" TEXT,
    "headerImage" TEXT,
    "punchline" TEXT,
    "description" TEXT,
    "longDescription" TEXT,
    "website" TEXT,
    "linkedinUrl" TEXT,
    "city" TEXT,
    "country" TEXT,
    "foundationDate" TIMESTAMP(3),
    "developmentStage" TEXT,
    "industries" TEXT[],
    "marketFocus" TEXT[],
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesCount" INTEGER NOT NULL DEFAULT 0,
    "profileSharedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bto_b_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "punchline" TEXT,
    "description" TEXT,
    "type" "OpportunityType" NOT NULL,
    "featureId" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "region" TEXT,
    "remote" BOOLEAN,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "applicationProcessId" TEXT,
    "needToCheckApplicant" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "backgroundImage" TEXT,
    "file" TEXT,
    "url" TEXT,
    "tags" TEXT[],
    "industries" TEXT[],
    "markets" TEXT[],
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "pricingUnit" TEXT,
    "pricingDetails" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiOutput" TEXT,
    "applicationsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "sharedCount" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "boosted" BOOLEAN NOT NULL DEFAULT false,
    "boostedUntil" TIMESTAMP(3),
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "referralAvailable" BOOLEAN NOT NULL DEFAULT false,
    "referralAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_processes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "candidateDescription" TEXT,

    CONSTRAINT "application_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "title" TEXT,
    "goalLetter" TEXT,
    "externalLink" TEXT,
    "externalLink2" TEXT,
    "submissionDate" TIMESTAMP(3),
    "stage" "ApplicationStage" NOT NULL DEFAULT 'DRAFT',
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "reviewDate" TIMESTAMP(3),
    "reviewFeedback" TEXT,
    "feedbackTitle" TEXT,
    "referralCodeUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT,
    "privateDiscussionId" TEXT,
    "publicDiscussionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_discussions" (
    "id" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_discussions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_discussions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "type" "DiscussionType" NOT NULL DEFAULT 'OPEN_FORUM',
    "ownerId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "membersCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_discussions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_opportunities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liked_opportunities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liked_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relatedItemId" TEXT,
    "relatedItemType" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMP(3),
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "type" "ReferralType",
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "potentialAmount" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "opportunitiesCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "order" INTEGER,
    "aiPrompt" TEXT,
    "seekerName" TEXT,
    "creatorName" TEXT,
    "seekerScenario" TEXT,
    "creatorScenario" TEXT,
    "displayType" TEXT,
    "noApplicationNeeded" BOOLEAN NOT NULL DEFAULT false,
    "opportunitiesCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "targetType" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bto_c_profiles_userId_key" ON "bto_c_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bto_b_profiles_userId_key" ON "bto_b_profiles"("userId");

-- CreateIndex
CREATE INDEX "opportunities_ownerId_idx" ON "opportunities"("ownerId");

-- CreateIndex
CREATE INDEX "opportunities_featureId_idx" ON "opportunities"("featureId");

-- CreateIndex
CREATE INDEX "opportunities_type_idx" ON "opportunities"("type");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_createdAt_idx" ON "opportunities"("createdAt");

-- CreateIndex
CREATE INDEX "opportunities_expirationDate_idx" ON "opportunities"("expirationDate");

-- CreateIndex
CREATE INDEX "opportunities_boostedUntil_idx" ON "opportunities"("boostedUntil");

-- CreateIndex
CREATE INDEX "opportunities_name_idx" ON "opportunities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "application_processes_name_key" ON "application_processes"("name");

-- CreateIndex
CREATE INDEX "applications_candidateId_idx" ON "applications"("candidateId");

-- CreateIndex
CREATE INDEX "applications_opportunityId_idx" ON "applications"("opportunityId");

-- CreateIndex
CREATE INDEX "applications_stage_idx" ON "applications"("stage");

-- CreateIndex
CREATE INDEX "applications_createdAt_idx" ON "applications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "applications_opportunityId_candidateId_key" ON "applications"("opportunityId", "candidateId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_receiverId_idx" ON "messages"("receiverId");

-- CreateIndex
CREATE INDEX "messages_privateDiscussionId_idx" ON "messages"("privateDiscussionId");

-- CreateIndex
CREATE INDEX "messages_publicDiscussionId_idx" ON "messages"("publicDiscussionId");

-- CreateIndex
CREATE UNIQUE INDEX "participants_userId_discussionId_key" ON "participants"("userId", "discussionId");

-- CreateIndex
CREATE INDEX "public_discussions_ownerId_idx" ON "public_discussions"("ownerId");

-- CreateIndex
CREATE INDEX "public_discussions_opportunityId_idx" ON "public_discussions"("opportunityId");

-- CreateIndex
CREATE INDEX "public_discussions_type_idx" ON "public_discussions"("type");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_opportunities_userId_opportunityId_key" ON "saved_opportunities"("userId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "liked_opportunities_userId_opportunityId_key" ON "liked_opportunities"("userId", "opportunityId");

-- CreateIndex
CREATE INDEX "ratings_itemId_idx" ON "ratings"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_itemId_userId_key" ON "ratings"("itemId", "userId");

-- CreateIndex
CREATE INDEX "tasks_userId_idx" ON "tasks"("userId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_ownerId_idx" ON "referral_codes"("ownerId");

-- CreateIndex
CREATE INDEX "referral_codes_code_idx" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_opportunityId_idx" ON "referral_codes"("opportunityId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "industries_name_key" ON "industries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "markets_name_key" ON "markets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "features_name_key" ON "features"("name");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminId_idx" ON "admin_audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "bto_c_profiles" ADD CONSTRAINT "bto_c_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bto_b_profiles" ADD CONSTRAINT "bto_b_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_applicationProcessId_fkey" FOREIGN KEY ("applicationProcessId") REFERENCES "application_processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_privateDiscussionId_fkey" FOREIGN KEY ("privateDiscussionId") REFERENCES "private_discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_publicDiscussionId_fkey" FOREIGN KEY ("publicDiscussionId") REFERENCES "public_discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "private_discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_discussions" ADD CONSTRAINT "public_discussions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_discussions" ADD CONSTRAINT "public_discussions_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liked_opportunities" ADD CONSTRAINT "liked_opportunities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liked_opportunities" ADD CONSTRAINT "liked_opportunities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

