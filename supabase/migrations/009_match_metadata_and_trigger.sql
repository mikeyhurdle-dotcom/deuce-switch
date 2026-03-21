-- ============================================================================
-- Migration 009: Match Metadata + Results Trigger
-- Adds conditions/court_side/intensity to matches & player_match_results,
-- creates the missing trigger that populates player_match_results when
-- a match is approved (the native app updates matches directly, not score_reports).
-- ============================================================================

-- ─── New columns on matches ─────────────────────────────────────────────────

ALTER TABLE matches ADD COLUMN IF NOT EXISTS conditions TEXT
  CHECK (conditions IN ('indoor', 'outdoor'));

ALTER TABLE matches ADD COLUMN IF NOT EXISTS court_side TEXT
  CHECK (court_side IN ('left', 'right', 'both'));

ALTER TABLE matches ADD COLUMN IF NOT EXISTS intensity TEXT
  CHECK (intensity IN ('casual', 'competitive', 'intense'));

-- ─── New columns on player_match_results ────────────────────────────────────

ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS conditions TEXT
  CHECK (conditions IN ('indoor', 'outdoor'));

ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS court_side TEXT
  CHECK (court_side IN ('left', 'right', 'both'));

ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS intensity TEXT
  CHECK (intensity IN ('casual', 'competitive', 'intense'));

-- Denormalized name columns (may already exist from an earlier migration)
ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS opponent1_name TEXT;
ALTER TABLE player_match_results ADD COLUMN IF NOT EXISTS opponent2_name TEXT;

-- Expand source CHECK to include all tournament formats
-- Drop existing constraint and re-add with full set
ALTER TABLE player_match_results DROP CONSTRAINT IF EXISTS player_match_results_source_check;
ALTER TABLE player_match_results ADD CONSTRAINT player_match_results_source_check
  CHECK (source IN ('americano', 'mexicano', 'team_americano', 'mixicano', 'playtomic', 'screenshot', 'manual'));

-- ─── Indexes for new columns ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pmr_conditions ON player_match_results(conditions) WHERE conditions IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pmr_court_side ON player_match_results(court_side) WHERE court_side IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pmr_intensity ON player_match_results(intensity) WHERE intensity IS NOT NULL;

-- ─── Trigger: populate player_match_results when matches.status → approved ──
-- The native app writes directly to the matches table (no score_reports
-- intermediary), so this trigger fires on matches UPDATE.

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
       team_score, opponent_score, won, source, conditions, court_side, intensity, played_at)
    VALUES
      (NEW.player1_id, NEW.tournament_id, NEW.id, NEW.player2_id, NEW.player3_id, NEW.player4_id,
       v_p2_name, v_p3_name, v_p4_name,
       NEW.team_a_score, NEW.team_b_score, v_won_a, COALESCE(v_format, 'americano'),
       NEW.conditions, NEW.court_side, NEW.intensity, COALESCE(NEW.actual_end_time, now()))
    ON CONFLICT DO NOTHING;

    -- Player 2 (Team A)
    INSERT INTO player_match_results
      (player_id, tournament_id, match_id, partner_id, opponent1_id, opponent2_id,
       partner_name, opponent1_name, opponent2_name,
       team_score, opponent_score, won, source, conditions, court_side, intensity, played_at)
    VALUES
      (NEW.player2_id, NEW.tournament_id, NEW.id, NEW.player1_id, NEW.player3_id, NEW.player4_id,
       v_p1_name, v_p3_name, v_p4_name,
       NEW.team_a_score, NEW.team_b_score, v_won_a, COALESCE(v_format, 'americano'),
       NEW.conditions, NEW.court_side, NEW.intensity, COALESCE(NEW.actual_end_time, now()))
    ON CONFLICT DO NOTHING;

    -- Player 3 (Team B)
    INSERT INTO player_match_results
      (player_id, tournament_id, match_id, partner_id, opponent1_id, opponent2_id,
       partner_name, opponent1_name, opponent2_name,
       team_score, opponent_score, won, source, conditions, court_side, intensity, played_at)
    VALUES
      (NEW.player3_id, NEW.tournament_id, NEW.id, NEW.player4_id, NEW.player1_id, NEW.player2_id,
       v_p4_name, v_p1_name, v_p2_name,
       NEW.team_b_score, NEW.team_a_score, NOT v_won_a, COALESCE(v_format, 'americano'),
       NEW.conditions, NEW.court_side, NEW.intensity, COALESCE(NEW.actual_end_time, now()))
    ON CONFLICT DO NOTHING;

    -- Player 4 (Team B)
    INSERT INTO player_match_results
      (player_id, tournament_id, match_id, partner_id, opponent1_id, opponent2_id,
       partner_name, opponent1_name, opponent2_name,
       team_score, opponent_score, won, source, conditions, court_side, intensity, played_at)
    VALUES
      (NEW.player4_id, NEW.tournament_id, NEW.id, NEW.player3_id, NEW.player1_id, NEW.player2_id,
       v_p3_name, v_p1_name, v_p2_name,
       NEW.team_b_score, NEW.team_a_score, NOT v_won_a, COALESCE(v_format, 'americano'),
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

-- Attach trigger to matches table
DROP TRIGGER IF EXISTS on_match_approved ON matches;
CREATE TRIGGER on_match_approved
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION record_match_results_from_match();
