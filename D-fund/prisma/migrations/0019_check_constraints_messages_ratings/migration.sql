-- Guarantees a message belongs to exactly one discussion (private XOR public),
-- never both and never neither. Both write paths in messages.service.ts
-- (createPrivateMessage / createPublicMessage) already respect this — this
-- constraint just makes the DB enforce what the app already guarantees,
-- so a future bug can't silently create an orphaned or dual-linked message.
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_discussion_exclusive_check"
  CHECK (
    ("privateDiscussionId" IS NOT NULL AND "publicDiscussionId" IS NULL)
    OR
    ("privateDiscussionId" IS NULL AND "publicDiscussionId" IS NOT NULL)
  );

-- Enforces the 1-5 range already validated at the DTO level (CreateRatingDto),
-- as defense-in-depth against any future write path that bypasses it (e.g.
-- a raw Prisma call, a script, a future admin tool).
ALTER TABLE "ratings"
  ADD CONSTRAINT "ratings_value_range_check"
  CHECK ("rating" >= 1 AND "rating" <= 5);
