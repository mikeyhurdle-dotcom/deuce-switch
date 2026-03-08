-- Push token storage for server-side notifications
-- Tokens registered per user per platform (iOS/Android)

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- RLS: users can only manage their own tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Index for efficient lookup by user_id (edge function queries by player list)
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
