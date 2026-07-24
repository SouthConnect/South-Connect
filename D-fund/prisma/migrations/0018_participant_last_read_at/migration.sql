-- Add Participant.lastReadAt so the nightly counter-resync cron can recompute
-- unreadCount from message history instead of only ever resetting it to 0.
-- Nullable, no default needed — null means "never marked read".

ALTER TABLE "participants" ADD COLUMN "lastReadAt" TIMESTAMP(3);
