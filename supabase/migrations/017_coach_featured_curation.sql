-- PLA-481: Coach tab launch curation
--
-- One-time data migration that seeds the `featured` flag on
-- training_videos for the v1.2.0 Coach tab launch.
--
-- Before v1.2.0 the Coach tab defaulted to showing every video
-- (485 rows across 159 channels) with only 9 featured across a
-- random mix of creators. That would have shipped unvetted
-- content to users during the marketing campaign.
--
-- This migration reduces the featured set to exactly the 6
-- launch partner creators agreed for v1.2.0:
--
--   The Padel School, the4Set, PADELARTE,
--   SP Padel Academy, Otro Nivel Padel, Padel Mobility
--
-- Expected post-migration counts (approximate; grows as
-- ScoutBot ingests new videos from these channels):
--
--   The Padel School     ~42
--   the4Set              ~34
--   PADELARTE            ~32
--   SP Padel Academy     ~28
--   Otro Nivel Padel     ~23
--   Padel Mobility       ~19
--   Total featured:     ~178
--
-- Deferred creators (not yet ingested by ScoutBot, will be
-- added in v1.2.1 once their channels are indexed):
--   - Everything Padel
--   - Hello Padel Academy
--   - Padel Academy 305
--
-- Reversal: to unfeature everything run
--   UPDATE training_videos SET featured = false;
-- To add a creator later run a targeted UPDATE on channel_name.
--
-- This migration was applied directly to production on
-- 2026-04-08 via the Supabase MCP tool. This file captures it
-- in the repo for history.

-- Step 1: reset everything to unfeatured so the featured set
-- is deterministic regardless of prior state.
UPDATE training_videos SET featured = false;

-- Step 2: feature all videos from the 6 launch creators.
UPDATE training_videos
SET featured = true
WHERE channel_name IN (
  'The Padel School',
  'the4Set',
  'PADELARTE',
  'SP Padel Academy',
  'Otro Nivel Padel',
  'Padel Mobility'
);
