-- 011: RLS enforcement on player_match_results + web trigger sync
-- Ensures data security before public launch and cross-app consistency.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Enable RLS on player_match_results (was missing)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE player_match_results ENABLE ROW LEVEL SECURITY;

-- Users can read their own match results
CREATE POLICY "Users can read own match results"
  ON player_match_results FOR SELECT
  USING (auth.uid() = player_id);

-- Users can insert their own match results (for OCR import / manual add)
CREATE POLICY "Users can insert own match results"
  ON player_match_results FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Users can update their own match results
CREATE POLICY "Users can update own match results"
  ON player_match_results FOR UPDATE
  USING (auth.uid() = player_id);

-- Users can delete their own match results (for undo import)
CREATE POLICY "Users can delete own match results"
  ON player_match_results FOR DELETE
  USING (auth.uid() = player_id);

-- Service role (triggers) can insert for any player
CREATE POLICY "Service role can insert match results"
  ON player_match_results FOR INSERT
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Update the record_match_results_from_match trigger to copy metadata
--    This ensures BOTH web and native tournament matches get conditions/
--    court_side/intensity written to player_match_results.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION record_match_results_from_match()
RETURNS TRIGGER AS $$
DECLARE
  t RECORD;
  team_a_won BOOLEAN;
  played TIMESTAMPTZ;
BEGIN
  -- Only fire when status transitions TO 'approved'
  IF NEW.status <> 'approved' OR (OLD.status = 'approved') THEN
    RETURN NEW;
  END IF;

  -- Get tournament info
  SELECT tournament_format INTO t FROM tournaments WHERE id = NEW.tournament_id;
  played := COALESCE(NEW.actual_end_time, now());
  team_a_won := COALESCE(NEW.team_a_score, 0) > COALESCE(NEW.team_b_score, 0);

  -- Team A player 1
  INSERT INTO player_match_results (
    player_id, tournament_id, match_id,
    partner_id, opponent1_id, opponent2_id,
    team_score, opponent_score, won,
    source, match_type, conditions, court_side, intensity,
    played_at
  ) VALUES (
    NEW.player1_id, NEW.tournament_id, NEW.id,
    NEW.player2_id, NEW.player3_id, NEW.player4_id,
    COALESCE(NEW.team_a_score, 0), COALESCE(NEW.team_b_score, 0), team_a_won,
    COALESCE(t.tournament_format, 'americano'), 'tournament',
    NEW.conditions, NEW.court_side, NEW.intensity,
    played
  ) ON CONFLICT DO NOTHING;

  -- Team A player 2
  IF NEW.player2_id IS NOT NULL THEN
    INSERT INTO player_match_results (
      player_id, tournament_id, match_id,
      partner_id, opponent1_id, opponent2_id,
      team_score, opponent_score, won,
      source, match_type, conditions, court_side, intensity,
      played_at
    ) VALUES (
      NEW.player2_id, NEW.tournament_id, NEW.id,
      NEW.player1_id, NEW.player3_id, NEW.player4_id,
      COALESCE(NEW.team_a_score, 0), COALESCE(NEW.team_b_score, 0), team_a_won,
      COALESCE(t.tournament_format, 'americano'), 'tournament',
      NEW.conditions, NEW.court_side, NEW.intensity,
      played
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Team B player 1
  INSERT INTO player_match_results (
    player_id, tournament_id, match_id,
    partner_id, opponent1_id, opponent2_id,
    team_score, opponent_score, won,
    source, match_type, conditions, court_side, intensity,
    played_at
  ) VALUES (
    NEW.player3_id, NEW.tournament_id, NEW.id,
    NEW.player4_id, NEW.player1_id, NEW.player2_id,
    COALESCE(NEW.team_b_score, 0), COALESCE(NEW.team_a_score, 0), NOT team_a_won,
    COALESCE(t.tournament_format, 'americano'), 'tournament',
    NEW.conditions, NEW.court_side, NEW.intensity,
    played
  ) ON CONFLICT DO NOTHING;

  -- Team B player 2
  IF NEW.player4_id IS NOT NULL THEN
    INSERT INTO player_match_results (
      player_id, tournament_id, match_id,
      partner_id, opponent1_id, opponent2_id,
      team_score, opponent_score, won,
      source, match_type, conditions, court_side, intensity,
      played_at
    ) VALUES (
      NEW.player4_id, NEW.tournament_id, NEW.id,
      NEW.player3_id, NEW.player1_id, NEW.player2_id,
      COALESCE(NEW.team_b_score, 0), COALESCE(NEW.team_a_score, 0), NOT team_a_won,
      COALESCE(t.tournament_format, 'americano'), 'tournament',
      NEW.conditions, NEW.court_side, NEW.intensity,
      played
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Update profile stats
  UPDATE profiles SET
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN team_a_won THEN 1 ELSE 0 END
  WHERE id IN (NEW.player1_id, NEW.player2_id);

  UPDATE profiles SET
    matches_played = matches_played + 1,
    matches_won = matches_won + CASE WHEN NOT team_a_won THEN 1 ELSE 0 END
  WHERE id IN (NEW.player3_id, NEW.player4_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Create the missing increment_profile_stats RPC
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_profile_stats(
  p_user_id UUID,
  p_matches INT,
  p_wins INT
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET matches_played = matches_played + p_matches,
      matches_won = matches_won + p_wins
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
