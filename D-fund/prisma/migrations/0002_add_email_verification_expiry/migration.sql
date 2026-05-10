-- AddColumn emailVerificationTokenExpiry to User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationTokenExpiry" TIMESTAMP(3);
