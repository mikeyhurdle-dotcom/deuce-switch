-- ─── get_player_suggestions ─────────────────────────────────────────────────
--
-- Returns ranked list of players the current user has shared tournaments with,
-- excluding already-connected/blocked users and unclaimed ghost profiles.
-- "The most important step a man can take is the next one."
--
CREATE OR REPLACE FUNCTION get_player_suggestions(
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  username TEXT,
  game_face_url TEXT,
  smashd_level NUMERIC,
  matches_played INT,
  matches_won INT,
  preferred_position TEXT,
  location TEXT,
  shared_tournament_count BIGINT,
  last_played_together TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH my_tournaments AS (
    -- All tournaments the current user participated in
    SELECT tp.tournament_id
    FROM tournament_players tp
    WHERE tp.player_id = auth.uid()
      AND tp.tournament_status = 'active'
  ),
  shared_players AS (
    -- All other players who shared tournaments with me
    SELECT
      tp.player_id,
      COUNT(DISTINCT tp.tournament_id) AS shared_count,
      MAX(t.created_at) AS last_played
    FROM tournament_players tp
    JOIN my_tournaments mt ON mt.tournament_id = tp.tournament_id
    JOIN tournaments t ON t.id = tp.tournament_id
    WHERE tp.player_id != auth.uid()
      AND tp.tournament_status = 'active'
    GROUP BY tp.player_id
  ),
  excluded_users AS (
    -- Users we already have a relationship with (connected, pending, blocked)
    SELECT
      CASE
        WHEN c.requester_id = auth.uid() THEN c.recipient_id
        ELSE c.requester_id
      END AS excluded_id
    FROM connections c
    WHERE (c.requester_id = auth.uid() OR c.recipient_id = auth.uid())
      AND c.status IN ('accepted', 'pending', 'blocked')
  )
  SELECT
    p.id AS user_id,
    p.display_name,
    p.username,
    p.game_face_url,
    p.smashd_level,
    p.matches_played,
    p.matches_won,
    p.preferred_position,
    p.location,
    sp.shared_count AS shared_tournament_count,
    sp.last_played AS last_played_together
  FROM shared_players sp
  JOIN profiles p ON p.id = sp.player_id
  WHERE p.id NOT IN (SELECT eu.excluded_id FROM excluded_users eu)
    AND (p.is_ghost = false OR p.claimed_by IS NOT NULL)
  ORDER BY sp.shared_count DESC, sp.last_played DESC
  LIMIT max_results;
END;
$$;
