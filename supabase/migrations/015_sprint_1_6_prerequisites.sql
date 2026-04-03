-- Sprint 1–6 prerequisites
-- All additive changes — safe to run against production.

-- ─── Sprint 3: Player Anonymisation ─────────────────────────────────────────
-- Allows organisers to toggle player name visibility in TV/leaderboard views.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS anonymise_players BOOLEAN DEFAULT FALSE;

-- ─── Sprint 4: Home Club ────────────────────────────────────────────────────
-- Links a player to their preferred padel club.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_club_id UUID REFERENCES clubs(id);

-- ─── Sprint 2: Avatar Storage ───────────────────────────────────────────────
-- Public bucket for profile picture uploads.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update/overwrite their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Anyone can read avatars (public bucket)
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- ─── Sprint 4: Spot Alert Subscriptions ─────────────────────────────────────
-- Tracks which users want notifications when spots open up for full events.
CREATE TABLE IF NOT EXISTS event_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- RLS: users can only manage their own alert subscriptions
ALTER TABLE event_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own alerts" ON event_alerts;
CREATE POLICY "Users can view own alerts"
  ON event_alerts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own alerts" ON event_alerts;
CREATE POLICY "Users can insert own alerts"
  ON event_alerts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own alerts" ON event_alerts;
CREATE POLICY "Users can delete own alerts"
  ON event_alerts FOR DELETE TO authenticated
  USING (user_id = auth.uid());
