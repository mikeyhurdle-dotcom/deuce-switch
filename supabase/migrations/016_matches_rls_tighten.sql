-- Tighten RLS on matches table: restrict UPDATE to participants and organisers only.
-- Previously "Anyone can update match scores" allowed any authenticated user to edit any match.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can update match scores" ON matches;

-- Participants can update their own matches (score entry)
CREATE POLICY "Participants can update own matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (player1_id, player2_id, player3_id, player4_id)
  )
  WITH CHECK (
    auth.uid() IN (player1_id, player2_id, player3_id, player4_id)
  );

-- Tournament organisers can update any match in their tournaments
CREATE POLICY "Organisers can update tournament matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = matches.tournament_id
        AND tournaments.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = matches.tournament_id
        AND tournaments.organizer_id = auth.uid()
    )
  );
