// Supabase table types — mirrored from schema
// Ported from deuce-switch-web/src/lib/types.ts

// ─── Format Types ─────────────────────────────────────────────────────────────

export type TournamentFormat = 'americano' | 'mexicano' | 'team_americano' | 'mixicano';
export type RankingMode = 'total_points' | 'avg_points';

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  team_americano: 'Team Americano',
  mixicano: 'Mixicano',
};

export const TOURNAMENT_FORMAT_DESCRIPTIONS: Record<TournamentFormat, string> = {
  americano: 'Rotate partners every round. Individual scoring.',
  mexicano: 'Dynamic pairing based on standings each round.',
  team_americano: 'Fixed teams of 2. Round-robin format.',
  mixicano: 'Mixed doubles — 1 male + 1 female per team.',
};

// ─── Core Tables ──────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  game_face_url: string | null;
  bio: string | null;
  location: string | null;
  smashd_level: number | null;
  playtomic_level: number | null;
  matches_played: number;
  matches_won: number;
  preferred_position: 'left' | 'right' | 'both' | null;
  gender: 'M' | 'F' | 'Other' | null;
  visibility: 'public' | 'private';
  marketing_email: boolean;
  marketing_push: boolean;
  marketing_consented_at: string | null;
  marketing_updated_at: string | null;
  is_ghost: boolean;
  claimed_by: string | null;
  claimed_at: string | null;
  ghost_email: string | null;
  claim_token: string | null;
  // Platform-specific display names (for OCR profile matching)
  playtomic_name: string | null;
  padelmates_name: string | null;
  nettla_name: string | null;
  matchii_name: string | null;
  // Equipment
  racket_brand: string | null;
  racket_model: string | null;
  shoe_brand: string | null;
  shoe_model: string | null;
  home_club_id: string | null;
  tracking_tools: TrackingTool[] | null;
  created_at: string;
};

export type TrackingTool =
  | 'padelio'
  | 'padelplay'
  | 'padel_point'
  | 'padel_pointer'
  | 'padeltick'
  | 'apple_health'
  | 'strava'
  | 'manual';

export type MatchRecord = {
  id: string;
  creator_id: string;
  played_at: string;
  match_type: 'competitive' | 'friendly' | 'tournament';
  format: string | null;
  partner_id: string | null;
  opponent1_id: string | null;
  opponent2_id: string | null;
  partner_name: string | null;
  opponent1_name: string | null;
  opponent2_name: string | null;
  venue: string | null;
  notes: string | null;
  source: string;
  created_at: string;
};

export type MatchScore = {
  id: string;
  match_record_id: string;
  set_number: number;
  team_a_score: number;
  team_b_score: number;
};

export type TrainingVideo = {
  id: string;
  title: string;
  youtube_url: string;
  channel_name: string | null;
  shot_type: string | null;
  skill_level: string | null;
  duration_minutes: number | null;
  description: string | null;
  tags: string[] | null;
  featured: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  organizer_id: string;
  tournament_format: TournamentFormat;
  points_per_match: number;
  time_per_round_seconds: number;
  max_players: number | null;
  club_id: string | null;
  join_code: string | null;
  status: 'draft' | 'running' | 'completed';
  current_round: number | null;
  current_round_started_at: string | null;
  current_round_duration_seconds: number | null;
  master_clock_running: boolean;
  anonymise_players: boolean;
  ranking_mode: RankingMode;
  created_at: string;
};

export type TournamentPlayer = {
  id: string;
  tournament_id: string;
  player_id: string;
  tournament_status: 'active' | 'waitlist' | 'dropped';
  waitlist_position: number | null;
  bye_count: number;
  created_at: string;
};

export type MatchConditions = 'indoor' | 'outdoor';
export type CourtSide = 'left' | 'right' | 'both';
export type MatchIntensity = 'casual' | 'competitive' | 'intense';

export type Match = {
  id: string;
  tournament_id: string;
  round_number: number;
  court_number: number | null;
  player1_id: string;
  player2_id: string;
  player3_id: string;
  player4_id: string;
  bye_player_id: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  status: 'pending' | 'in_progress' | 'reported' | 'approved';
  conditions: MatchConditions | null;
  court_side: CourtSide | null;
  intensity: MatchIntensity | null;
  target_start_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  created_at: string;
  updated_at: string;
};

export type ScoreReport = {
  id: string;
  tournament_id: string;
  round_number: number;
  court_label: string | null;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  team_a_score: number;
  team_b_score: number;
  reporter_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type MatchSource =
  | 'americano'
  | 'mexicano'
  | 'team_americano'
  | 'mixicano'
  | 'playtomic'
  | 'screenshot'
  | 'manual'
  | 'open_game';

export type MatchType = 'competitive' | 'friendly' | 'tournament';

export type DetectedPlatform = 'playtomic' | 'padelmates' | 'nettla' | 'matchii' | 'unknown';

export type SetScore = {
  team_a: number;
  team_b: number;
};

export type PlayerMatchResult = {
  id: string;
  player_id: string;
  tournament_id: string | null;
  match_id: string | null;
  partner_id: string | null;
  opponent1_id: string | null;
  opponent2_id: string | null;
  team_score: number;
  opponent_score: number;
  won: boolean;
  source: MatchSource;
  match_type: MatchType | null;
  platform_source: string | null;
  venue: string | null;
  set_scores: SetScore[] | null;
  import_batch_id: string | null;
  score_edited: boolean;
  conditions: MatchConditions | null;
  court_side: CourtSide | null;
  intensity: MatchIntensity | null;
  played_at: string;
  created_at: string;
  partner_name: string | null;
  opponent1_name: string | null;
  opponent2_name: string | null;
  tournaments?: {
    name: string;
    tournament_format: TournamentFormat;
  } | null;
};

export type PlatformRating = {
  id: string;
  player_id: string;
  platform: DetectedPlatform;
  rating: number;
  rating_label: string | null;
  match_result_id: string | null;
  recorded_at: string;
  created_at: string;
};

// ─── OCR Match Import Types ──────────────────────────────────────────────────

export type OCRMatch = {
  date: string | null;
  time: string | null;
  venue: string | null;
  court: string | null;
  sets: SetScore[];
  team_a: string[];
  team_b: string[];
  user_team: 'a' | 'b' | null;
  won: boolean | null;
  ratings: Record<string, number>;
  match_type_hint: 'competitive' | 'friendly' | null;
};

export type OCRMatchImportResult = {
  platform: DetectedPlatform;
  confidence: number;
  matches: OCRMatch[];
};

export type Club = {
  id: string;
  name: string;
  slug: string;
  playtomic_tenant_id: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  court_count: number | null;
  indoor_courts: number;
  outdoor_courts: number;
  description: string | null;
  image_url: string | null;
  is_partner: boolean;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  tournament_id: string;
  team_name: string;
  player1_id: string;
  player2_id: string;
  created_at: string;
};

export type ConsentAuditLog = {
  id: string;
  player_id: string;
  action: 'opt_in' | 'opt_out' | 'update';
  channel: 'email' | 'push' | 'all';
  new_value: boolean;
  source: 'registration' | 'settings' | 'api' | 'admin';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

// ─── Connections ─────────────────────────────────────────────────────────────

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';
export type ConnectionDirection = 'outgoing' | 'incoming';

export type Connection = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
};

/** Returned by `get_connection_status` RPC */
export type ConnectionStatusResult = {
  status: ConnectionStatus | 'none' | 'self';
  connection_id?: string;
  direction?: ConnectionDirection;
};

/** Returned by `get_connections` RPC */
export type ConnectionProfile = {
  connection_id: string;
  accepted_at?: string;
  connected_since?: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  game_face_url: string | null;
  smashd_level: number | null;
  matches_played: number;
  matches_won: number;
  preferred_position: 'left' | 'right' | 'both' | null;
  location: string | null;
};

/** Returned by `get_pending_requests` RPC */
export type PendingRequest = {
  connection_id: string;
  requested_at: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  game_face_url: string | null;
  smashd_level: number | null;
  location: string | null;
};

/** Returned by mutation RPCs (send/respond/remove) */
export type ConnectionMutationResult = {
  success?: boolean;
  error?: string;
  connection_id?: string;
  status?: string;
  message?: string;
  removed?: boolean;
};

/** Returned by `get_player_suggestions` RPC */
export type PlayerSuggestion = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  game_face_url: string | null;
  smashd_level: number | null;
  matches_played: number;
  matches_won: number;
  preferred_position: 'left' | 'right' | 'both' | null;
  location: string | null;
  shared_tournament_count: number;
  last_played_together: string;
};

// ─── Tournament Feed ─────────────────────────────────────────────────────────

export type ReactionType = 'like' | 'fire' | 'laugh';

export type ReactionCounts = Record<ReactionType, number>;

/** Returned by `get_tournament_feed` RPC */
export type FeedPost = {
  post_id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  content: string;
  image_url: string | null;
  created_at: string;
  comment_count: number;
  reaction_counts: ReactionCounts;
  user_reactions: ReactionType[];
};

/** Returned by `get_post_comments` RPC */
export type FeedComment = {
  comment_id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  content: string;
  created_at: string;
};

/** Returned by mutation RPCs (create_tournament_post, add_comment, toggle_reaction) */
export type FeedMutationResult = {
  success?: boolean;
  error?: string;
  post_id?: string;
  comment_id?: string;
  action?: 'added' | 'removed';
  reaction?: ReactionType;
  created_at?: string;
};

// ─── Engine Types (used by pairing algorithm + standings) ─────────────────────

export type AmericanoPlayer = {
  id: string;
  displayName: string;
  gameFaceUrl?: string | null;
};

export type AmericanoMatch = {
  id: string;
  roundNumber: number;
  courtNumber?: number;
  teamA: string[];
  teamB: string[];
  byePlayerId?: string | null;
};

export type AmericanoResult = {
  matchId: string;
  teamAScore: number;
  teamBScore: number;
};

export type AmericanoStanding = {
  playerId: string;
  displayName: string;
  gameFaceUrl?: string | null;
  pointsFor: number;
  pointsAgainst: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgPointsPerRound: number;
};

export type TeamStanding = {
  teamId: string;
  teamName: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  pointsFor: number;
  pointsAgainst: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
};
