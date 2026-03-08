-- ─── Tournament Feed — Posts, Comments, Reactions ─────────────────────────────
--
-- Tournament-scoped social feed. Posts, threaded comments, emoji reactions.
-- Only tournament participants can post/view/react.
-- "A journey will have pain and failure. It is not only the steps forward
--  that we must accept. It is the stumbles. The trials. The knowledge that
--  we will fail."

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── tournament_posts ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournament_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_posts_tournament
  ON tournament_posts(tournament_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tournament_posts_author
  ON tournament_posts(author_id);

-- ── tournament_comments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournament_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES tournament_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_comments_post
  ON tournament_comments(post_id, created_at ASC);

-- ── tournament_reactions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournament_reactions (
  post_id UUID NOT NULL REFERENCES tournament_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'fire', 'laugh')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_tournament_reactions_post
  ON tournament_reactions(post_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

-- Helper: check if user is a participant in a tournament
CREATE OR REPLACE FUNCTION is_tournament_participant(t_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tournament_players
    WHERE tournament_id = t_id
      AND player_id = auth.uid()
      AND tournament_status = 'active'
  );
$$;

-- ── Posts RLS ────────────────────────────────────────────────────────────────

ALTER TABLE tournament_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view tournament posts"
  ON tournament_posts FOR SELECT
  USING (is_tournament_participant(tournament_id));

CREATE POLICY "Participants can create posts"
  ON tournament_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND is_tournament_participant(tournament_id)
  );

CREATE POLICY "Authors can update own posts"
  ON tournament_posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own posts"
  ON tournament_posts FOR DELETE
  USING (auth.uid() = author_id);

-- ── Comments RLS ────────────────────────────────────────────────────────────

ALTER TABLE tournament_comments ENABLE ROW LEVEL SECURITY;

-- Comments inherit tournament access from their parent post
CREATE POLICY "Participants can view comments"
  ON tournament_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_posts p
      WHERE p.id = post_id
        AND is_tournament_participant(p.tournament_id)
    )
  );

CREATE POLICY "Participants can create comments"
  ON tournament_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM tournament_posts p
      WHERE p.id = post_id
        AND is_tournament_participant(p.tournament_id)
    )
  );

CREATE POLICY "Authors can delete own comments"
  ON tournament_comments FOR DELETE
  USING (auth.uid() = author_id);

-- ── Reactions RLS ───────────────────────────────────────────────────────────

ALTER TABLE tournament_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view reactions"
  ON tournament_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_posts p
      WHERE p.id = post_id
        AND is_tournament_participant(p.tournament_id)
    )
  );

CREATE POLICY "Participants can add reactions"
  ON tournament_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tournament_posts p
      WHERE p.id = post_id
        AND is_tournament_participant(p.tournament_id)
    )
  );

CREATE POLICY "Users can remove own reactions"
  ON tournament_reactions FOR DELETE
  USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── create_tournament_post ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_tournament_post(
  p_tournament_id UUID,
  p_content TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post tournament_posts;
BEGIN
  -- Verify the user is a participant
  IF NOT is_tournament_participant(p_tournament_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not a tournament participant');
  END IF;

  INSERT INTO tournament_posts (tournament_id, author_id, content, image_url)
  VALUES (p_tournament_id, auth.uid(), p_content, p_image_url)
  RETURNING * INTO v_post;

  RETURN json_build_object(
    'success', true,
    'post_id', v_post.id,
    'created_at', v_post.created_at
  );
END;
$$;

-- ── get_tournament_feed ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_tournament_feed(
  p_tournament_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  author_id UUID,
  author_name TEXT,
  author_avatar TEXT,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  comment_count BIGINT,
  reaction_counts JSON,
  user_reactions JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the user is a participant
  IF NOT is_tournament_participant(p_tournament_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    tp.id AS post_id,
    tp.author_id,
    p.display_name AS author_name,
    p.game_face_url AS author_avatar,
    tp.content,
    tp.image_url,
    tp.created_at,
    -- Comment count
    (SELECT COUNT(*) FROM tournament_comments tc WHERE tc.post_id = tp.id) AS comment_count,
    -- Aggregated reaction counts: {"like": 3, "fire": 1, "laugh": 0}
    (
      SELECT COALESCE(json_object_agg(rt, cnt), '{}')
      FROM (
        SELECT
          unnest(ARRAY['like', 'fire', 'laugh']) AS rt,
          unnest(ARRAY[
            (SELECT COUNT(*) FROM tournament_reactions tr WHERE tr.post_id = tp.id AND tr.reaction_type = 'like'),
            (SELECT COUNT(*) FROM tournament_reactions tr WHERE tr.post_id = tp.id AND tr.reaction_type = 'fire'),
            (SELECT COUNT(*) FROM tournament_reactions tr WHERE tr.post_id = tp.id AND tr.reaction_type = 'laugh')
          ]) AS cnt
      ) sub
    ) AS reaction_counts,
    -- Current user's reactions: ["like", "fire"]
    (
      SELECT COALESCE(json_agg(tr.reaction_type), '[]'::json)
      FROM tournament_reactions tr
      WHERE tr.post_id = tp.id AND tr.user_id = auth.uid()
    ) AS user_reactions
  FROM tournament_posts tp
  JOIN profiles p ON p.id = tp.author_id
  WHERE tp.tournament_id = p_tournament_id
  ORDER BY tp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ── add_comment ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION add_comment(
  p_post_id UUID,
  p_content TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_id UUID;
  v_comment tournament_comments;
BEGIN
  -- Get the tournament_id from the post
  SELECT tp.tournament_id INTO v_tournament_id
  FROM tournament_posts tp
  WHERE tp.id = p_post_id;

  IF v_tournament_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Post not found');
  END IF;

  -- Verify the user is a participant
  IF NOT is_tournament_participant(v_tournament_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not a tournament participant');
  END IF;

  INSERT INTO tournament_comments (post_id, author_id, content)
  VALUES (p_post_id, auth.uid(), p_content)
  RETURNING * INTO v_comment;

  RETURN json_build_object(
    'success', true,
    'comment_id', v_comment.id,
    'created_at', v_comment.created_at
  );
END;
$$;

-- ── get_post_comments ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_post_comments(
  p_post_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  comment_id UUID,
  author_id UUID,
  author_name TEXT,
  author_avatar TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_id UUID;
BEGIN
  -- Get the tournament_id from the post
  SELECT tp.tournament_id INTO v_tournament_id
  FROM tournament_posts tp
  WHERE tp.id = p_post_id;

  -- Verify the user is a participant
  IF v_tournament_id IS NULL OR NOT is_tournament_participant(v_tournament_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    tc.id AS comment_id,
    tc.author_id,
    p.display_name AS author_name,
    p.game_face_url AS author_avatar,
    tc.content,
    tc.created_at
  FROM tournament_comments tc
  JOIN profiles p ON p.id = tc.author_id
  WHERE tc.post_id = p_post_id
  ORDER BY tc.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ── toggle_reaction ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION toggle_reaction(
  p_post_id UUID,
  p_reaction_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Validate reaction type
  IF p_reaction_type NOT IN ('like', 'fire', 'laugh') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid reaction type');
  END IF;

  -- Get the tournament_id from the post
  SELECT tp.tournament_id INTO v_tournament_id
  FROM tournament_posts tp
  WHERE tp.id = p_post_id;

  IF v_tournament_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Post not found');
  END IF;

  -- Verify the user is a participant
  IF NOT is_tournament_participant(v_tournament_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not a tournament participant');
  END IF;

  -- Check if reaction already exists
  SELECT EXISTS (
    SELECT 1 FROM tournament_reactions
    WHERE post_id = p_post_id
      AND user_id = auth.uid()
      AND reaction_type = p_reaction_type
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove the reaction
    DELETE FROM tournament_reactions
    WHERE post_id = p_post_id
      AND user_id = auth.uid()
      AND reaction_type = p_reaction_type;

    RETURN json_build_object('success', true, 'action', 'removed', 'reaction', p_reaction_type);
  ELSE
    -- Add the reaction
    INSERT INTO tournament_reactions (post_id, user_id, reaction_type)
    VALUES (p_post_id, auth.uid(), p_reaction_type);

    RETURN json_build_object('success', true, 'action', 'added', 'reaction', p_reaction_type);
  END IF;
END;
$$;
