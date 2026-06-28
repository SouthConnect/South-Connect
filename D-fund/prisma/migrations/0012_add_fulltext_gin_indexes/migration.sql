-- GIN indexes for PostgreSQL full-text search (Prisma previewFeature = "fullTextSearch").
-- These indexes make to_tsvector / to_tsquery lookups O(log n) instead of full table scans.
-- Note: CONCURRENTLY is not used here because Prisma runs migrations inside a transaction.

-- opportunities: name | punchline | description (each field is searched individually via OR)
CREATE INDEX IF NOT EXISTS "opportunities_name_gin_idx"
  ON "opportunities" USING GIN (to_tsvector('english', coalesce("name", '')));

CREATE INDEX IF NOT EXISTS "opportunities_punchline_gin_idx"
  ON "opportunities" USING GIN (to_tsvector('english', coalesce("punchline", '')));

CREATE INDEX IF NOT EXISTS "opportunities_description_gin_idx"
  ON "opportunities" USING GIN (to_tsvector('english', coalesce("description", '')));

-- users: name | bio
CREATE INDEX IF NOT EXISTS "users_name_gin_idx"
  ON "users" USING GIN (to_tsvector('english', coalesce("name", '')));

CREATE INDEX IF NOT EXISTS "users_bio_gin_idx"
  ON "users" USING GIN (to_tsvector('english', coalesce("bio", '')));

-- bto_b_profiles: companyName
CREATE INDEX IF NOT EXISTS "bto_b_profiles_company_name_gin_idx"
  ON "bto_b_profiles" USING GIN (to_tsvector('english', coalesce("companyName", '')));
