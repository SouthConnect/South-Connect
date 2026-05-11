-- Migration: add trendingScore to opportunities
-- Pre-computed hourly by cron so ORDER BY trendingScore needs no runtime calculation.

ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
