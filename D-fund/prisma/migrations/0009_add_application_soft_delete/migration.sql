-- Add soft-delete support to Application model
-- Allows candidates to withdraw their application without hard-deleting the record.
ALTER TABLE "applications" ADD COLUMN "deletedAt" TIMESTAMP(3);
