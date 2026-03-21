-- ============================================================================
-- Migration 010: Match Import Upgrade
-- Adds match_type, platform_source, venue, set_scores, import_batch_id to
-- player_match_results. Creates platform_ratings table for external rating
-- tracking. Adds platform name columns to profiles. Updates trigger to set
-- match_type = 'tournament' for tournament-sourced results.
--
-- "The most important step a man can take is the next one."
-- ============================================================================

-- ─── New columns on player_match_results ──────────────────────────────────────

-- match_type: what kind of game (orthogonal to source which tracks HOW data entered)
ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS match_type TEXT
  CHECK (match_type IN ('competitive', 'friendly', 'tournament'))
  DEFAULT 'competitive';

-- platform_source: which booking app the data came from
ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS platform_source TEXT
  CHECK (platform_source IN ('playtomic', 'padelmates', 'nettla', 'matchii', 'smashd'));

-- venue: club/facility name as extracted from screenshot or entered manually
ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS venue TEXT;

-- set_scores: per-set breakdown e.g. [{"team_a":6,"team_b":4},{"team_a":6,"team_b":1}]
ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS set_scores JSONB;

-- import_batch_id: groups matches imported from a single screenshot for undo
ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- score_edited: flag if user manually changed OCR-extracted scores during review
ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS score_edited BOOLEAN DEFAULT FALSE;

-- ─── Expand source CHECK ──────────────────────────────────────────────────────

ALTER TABLE player_match_results DROP CONSTRAINT IF EXISTS player_match_results_source_check;
ALTER TABLE player_match_results ADD CONSTRAINT player_match_results_source_check
  CHECK (source IN ('americano', 'mexicano', 'team_americano', 'mixicano',
                    'playtomic', 'screenshot', 'manual', 'open_game'));

-- ─── Indexes for new columns ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pmr_match_type ON player_match_results(match_type)
  WHERE match_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pmr_platform_source ON player_match_results(platform_source)
  WHERE platform_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pmr_import_batch ON player_match_results(import_batch_id)
  WHERE import_batch_id IS NOT NULL;

-- ─── Backfill existing data ───────────────────────────────────────────────────

-- Tournament-sourced rows → match_type = 'tournament'
UPDATE player_match_results
SET match_type = 'tournament'
WHERE tournament_id IS NOT NULL
  AND match_type IS NULL;

-- Non-tournament rows (screenshot/manual) → match_type = 'competitive' (default)
UPDATE player_match_results
SET match_type = 'competitive'
WHERE tournament_id IS NULL
  AND match_type IS NULL;

-- ─── Platform ratings table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('playtomic', 'padelmates', 'nettla', 'matchii')),
  rating DECIMAL(5,2) NOT NULL,
  rating_label TEXT,                -- e.g. "Level", "ELO", for display context
  match_result_id UUID REFERENCES player_match_results(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary query pattern: rating history chart per user per platform
CREATE INDEX IF NOT EXISTS idx_platform_ratings_lookup
  ON platform_ratings(player_id, platform, recorded_at DESC);

-- RLS: users can read their own ratings, insert their own ratings
ALTER TABLE platform_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ratings"
  ON platform_ratings FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can insert own ratings"
  ON platform_ratings FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can delete own ratings"
  ON platform_ratings FOR DELETE
  USING (auth.uid() = player_id);

-- ─── Platform name columns on profiles ────────────────────────────────────────
-- Schema only — no UI yet. Used by match import service for better name matching.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nettla_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS playtomic_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS padelmates_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matchii_name TEXT;

-- ─── Update trigger to set match_type = 'tournament' ─────────────────────────

CREATE OR REPLACE FUNCTION record_match_results_from_match()
RETURNS TRIGGER AS $$
DECLARE
  v_won_a BOOLEAN;
  v_format TEXT;
  v_p1_name TEXT;
  v_p2_name TEXT;
  v_p3_name TEXT;
  v_p4_name TEXT;
BEGIN
  -- Only fire when status transitions to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN

    -- Skip if scores are null (shouldn't happen but guard against it)
    IF NEW.team_a_score IS NULL OR NEW.team_b_score IS NULL THEN
      RETURN NEW;
    END IF;

    v_won_a := NEW.team_a_score > NEW.team_b_score;

    -- Get tournament format for the source field
    SELECT tournament_format INTO v_format
    FROM tournaments
    WHERE id = NEW.tournament_id;

    -- Resolve display names for denormalized columns
    SELECT display_name INTO v_p1_name FROM profiles WHERE id = NEW.player1_id;
    SELECT display_name INTO v_p2_name FROM profiles WHERE id = NEW.player2_id;
    SELECT display_name INTO v_p3_name FROM profiles WHERE id = NEW.player3_id;
    SELECT display_name INTO v_p4_name FROM profiles WHERE id = NEW.player4_id;

    -- Player 1 (Team A)
    INSERT INTO player_match_results
      (player_id, tournament_id, match_id, partner_id, opponent1_id, opponent2_id,
       partner_name, opponent1_name, opponent2_name,
       team_score, opponent_score, won, source, match_type,
       conditions, court_side, intensity, played_at)
    VALUES
      (NEW.player1_id, NEW.tournament_id, NEW.id, NEW.player2_id, NEW.player3_id, NEW.player4_id,
       v_p2_name, v_p3_name, v_p4_name,
       NEW.team_a_score, NEW.team_b_score, v_won_a, COALESCE(v_format, 'americano'), 'tournament',
       NEW.conditions, NEW.court_side, NEW.intensity, COALESCE(NEW.actual_end_time, now()))
    ON CONFLICT DO NOTHING;

    -- Player 2 (Team A)
    INSERT INTO player_match_results
      (player_id, tournament_id, match_id, partner_id, opponent1_id, opponent2_id,
       partner_name, opponent1_name, opponent2_name,
       team_score, opponent_score, won, source, match_type,
       conditions, court_side, intensity, played_at)
    VALUES
      (NEW.player2_id, NEW.tournament_id, NEW.id, NEW.player1_id, NEW.player3_id, NEW.player4_id,
       v_p1_name, v_p3_name, v_p4_name,
       NEW.team_a_score, NEW.team_b_score, v_won_a, COALESCE(v_format, 'americano'), 'tournament',
       NEW.conditions, NEW.court_side, NEW.intensity, COALESCE(NEW.actual_end_time, now()))
    ON CONFLICT DO NOTHING;

    -- Player 3 (Team B)
    INSERT INTO player_match_results
      (player_id, tournament_id, match_id, partner_id, opponent1_id, opponent2_id,
       partner_name, opponent1_name, opponent2_name,
       team_score, opponent_score, won, source, match_type,
       conditions, court_side, intensity, played_at)
    VALUES
      (NEW.player3_id, NEW.tournament_id, NEW.id, NEW.player4_id, NEW.player1_id, NEW.player2_id,
       v_p4_name, v_p1_name, v_p2_name,
       NEW.team_b_score, NEW.team_a_score, NOT v_won_a, COALESCE(v_format, 'americano'), 'tournament',
       NEW.conditions, NEW.court_side, NEW.intensity, COALESCE(NEW.actual_end_time, now()))
    ON CONFLICT DO NOTHING;

    -- Player 4 (Team B)
    INSERT INTO player_match_results
      (player_id, tournament_id, match_id, partner_id, opponent1_id, opponent2_id,
       partner_name, opponent1_name, opponent2_name,
       team_score, opponent_score, won, source, match_type,
       conditions, court_side, intensity, played_at)
    VALUES
      (NEW.player4_id, NEW.tournament_id, NEW.id, NEW.player3_id, NEW.player1_id, NEW.player2_id,
       v_p3_name, v_p1_name, v_p2_name,
       NEW.team_b_score, NEW.team_a_score, NOT v_won_a, COALESCE(v_format, 'americano'), 'tournament',
       NEW.conditions, NEW.court_side, NEW.intensity, COALESCE(NEW.actual_end_time, now()))
    ON CONFLICT DO NOTHING;

    -- Update aggregate stats on profiles for all 4 players
    UPDATE profiles
    SET matches_played = matches_played + 1,
        matches_won = matches_won + CASE
          WHEN id IN (NEW.player1_id, NEW.player2_id) AND v_won_a THEN 1
          WHEN id IN (NEW.player3_id, NEW.player4_id) AND NOT v_won_a THEN 1
          ELSE 0
        END
    WHERE id IN (NEW.player1_id, NEW.player2_id, NEW.player3_id, NEW.player4_id);

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger (function replaced above, trigger binding stays the same)
DROP TRIGGER IF EXISTS on_match_approved ON matches;
CREATE TRIGGER on_match_approved
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION record_match_results_from_match();
