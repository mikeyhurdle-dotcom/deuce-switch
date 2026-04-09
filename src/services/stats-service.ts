/**
 * Stats Service
 *
 * Queries player match results from Supabase and computes
 * stats for the Stats dashboard. All aggregation is done
 * client-side from `player_match_results`.
 *
 * "The most important step a man can take is the next one."
 */

import { supabase } from '../lib/supabase';
import type { PlayerMatchResult, MatchSource, MatchType, MatchConditions, CourtSide, MatchIntensity, TournamentFormat } from '../lib/types';

// ─── Public Types ───────────────────────────────────────────────────────────

export type FormResult = 'W' | 'L' | 'D';

export type PartnerStat = {
  id: string;
  name: string;
  initials: string;
  matchesTogether: number;
  winRate: number;
};

export type RivalStat = {
  id: string;
  name: string;
  initials: string;
  wins: number;
  draws: number;
  losses: number;
};

export type FormatBreakdown = {
  label: string;
  winRate: number;
  matchCount: number;
};

export type Streak = {
  type: 'W' | 'L' | 'D';
  count: number;
};

export type PlayerStats = {
  // Hero card
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  tournamentWins: number;
  tournamentCount: number;
  currentStreak: Streak;

  // Recent form (last 10)
  recentForm: FormResult[];

  // Best partners (top 5)
  partners: PartnerStat[];

  // Head-to-head rivals (top 5)
  rivals: RivalStat[];

  // Breakdowns (win % per category)
  formatBreakdown: FormatBreakdown[];
  conditionsBreakdown: FormatBreakdown[];
  courtSideBreakdown: FormatBreakdown[];
  intensityBreakdown: FormatBreakdown[];
  matchTypeBreakdown: FormatBreakdown[];
  winRateTrend: WinRatePoint[];
};

export type Period = 'Week' | 'Month' | 'Season' | 'All Time';

export type MatchTypeFilter = 'all' | 'competitive' | 'friendly' | 'tournament';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPeriodStart(period: Period): string | null {
  const now = new Date();
  switch (period) {
    case 'Week':
      return new Date(now.getTime() - 7 * 86_400_000).toISOString();
    case 'Month':
      return new Date(now.getTime() - 30 * 86_400_000).toISOString();
    case 'Season':
      return new Date(now.getTime() - 90 * 86_400_000).toISOString();
    case 'All Time':
      return null;
  }
}

function getInitials(name: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toFormResult(row: PlayerMatchResult): FormResult {
  if (row.won) return 'W';
  if (row.team_score === row.opponent_score) return 'D';
  return 'L';
}

const FORMAT_LABELS: Record<string, string> = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  team_americano: 'Team',
  mixicano: 'Mixicano',
  playtomic: 'Playtomic',
  screenshot: 'Screenshot',
  manual: 'Manual',
};

// ─── Core fetch ─────────────────────────────────────────────────────────────

/**
 * Fetch all player_match_results for a user, optionally filtered by period.
 * Returns rows sorted by played_at DESC (newest first).
 */
async function fetchResults(
  userId: string,
  period: Period,
  matchType: MatchTypeFilter = 'all',
): Promise<PlayerMatchResult[]> {
  const periodStart = getPeriodStart(period);

  let query = supabase
    .from('player_match_results')
    .select('*')
    .eq('player_id', userId)
    .order('played_at', { ascending: false });

  if (periodStart) {
    query = query.gte('played_at', periodStart);
  }

  if (matchType !== 'all') {
    query = query.eq('match_type', matchType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PlayerMatchResult[];
}

// ─── Aggregations ───────────────────────────────────────────────────────────

function computeStreak(rows: PlayerMatchResult[]): Streak {
  if (rows.length === 0) return { type: 'W', count: 0 };

  const first = toFormResult(rows[0]);
  let count = 1;

  for (let i = 1; i < rows.length; i++) {
    if (toFormResult(rows[i]) === first) {
      count++;
    } else {
      break;
    }
  }

  return { type: first, count };
}

function computeTournamentWins(rows: PlayerMatchResult[]): number {
  // Group by tournament_id, check if user won the majority of matches
  // For a proper "tournament win" we'd need final standings, but as an
  // approximation we count distinct tournaments where the user won > 50% of matches
  const tournamentMap = new Map<string, { wins: number; total: number }>();

  for (const row of rows) {
    if (!row.tournament_id) continue;
    const entry = tournamentMap.get(row.tournament_id) ?? { wins: 0, total: 0 };
    entry.total++;
    if (row.won) entry.wins++;
    tournamentMap.set(row.tournament_id, entry);
  }

  let tournamentWins = 0;
  for (const entry of tournamentMap.values()) {
    // Only count tournaments with 3+ matches (not trivial) where win rate > 60%
    if (entry.total >= 3 && entry.wins / entry.total > 0.6) {
      tournamentWins++;
    }
  }
  return tournamentWins;
}

function computePartners(rows: PlayerMatchResult[]): PartnerStat[] {
  const map = new Map<string, { name: string; total: number; wins: number }>();

  for (const row of rows) {
    if (!row.partner_id) continue;
    const entry = map.get(row.partner_id) ?? { name: row.partner_name ?? 'Unknown', total: 0, wins: 0 };
    entry.total++;
    if (row.won) entry.wins++;
    // Update name in case a later row has a non-null name
    if (row.partner_name) entry.name = row.partner_name;
    map.set(row.partner_id, entry);
  }

  return Array.from(map.entries())
    .map(([id, entry]) => ({
      id,
      name: entry.name,
      initials: getInitials(entry.name),
      matchesTogether: entry.total,
      winRate: entry.total > 0 ? Math.round((entry.wins / entry.total) * 100) : 0,
    }))
    .sort((a, b) => b.matchesTogether - a.matchesTogether)
    .slice(0, 5);
}

function computeRivals(rows: PlayerMatchResult[]): RivalStat[] {
  const map = new Map<string, { name: string; wins: number; draws: number; losses: number }>();

  const trackOpponent = (
    opponentId: string | null,
    opponentName: string | null,
    won: boolean,
    isDraw: boolean,
  ) => {
    if (!opponentId) return;
    const entry = map.get(opponentId) ?? { name: opponentName ?? 'Unknown', wins: 0, draws: 0, losses: 0 };
    if (isDraw) entry.draws++;
    else if (won) entry.wins++;
    else entry.losses++;
    if (opponentName) entry.name = opponentName;
    map.set(opponentId, entry);
  };

  for (const row of rows) {
    const isDraw = row.team_score === row.opponent_score;
    trackOpponent(row.opponent1_id, row.opponent1_name, row.won, isDraw);
    trackOpponent(row.opponent2_id, row.opponent2_name, row.won, isDraw);
  }

  return Array.from(map.entries())
    .map(([id, entry]) => ({
      id,
      name: entry.name,
      initials: getInitials(entry.name),
      wins: entry.wins,
      draws: entry.draws,
      losses: entry.losses,
    }))
    .sort((a, b) => (b.wins + b.draws + b.losses) - (a.wins + a.draws + a.losses))
    .slice(0, 5);
}

function computeFormatBreakdown(rows: PlayerMatchResult[]): FormatBreakdown[] {
  const map = new Map<string, { total: number; wins: number }>();

  for (const row of rows) {
    const key = row.source;
    const entry = map.get(key) ?? { total: 0, wins: 0 };
    entry.total++;
    if (row.won) entry.wins++;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([key, entry]) => ({
      label: FORMAT_LABELS[key] ?? key,
      winRate: entry.total > 0 ? Math.round((entry.wins / entry.total) * 100) : 0,
      matchCount: entry.total,
    }))
    .sort((a, b) => b.matchCount - a.matchCount);
}

const CONDITIONS_LABELS: Record<string, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
};

const COURT_SIDE_LABELS: Record<string, string> = {
  left: 'Left Side',
  right: 'Right Side',
  both: 'Both Sides',
};

const INTENSITY_LABELS: Record<string, string> = {
  casual: 'Casual',
  competitive: 'Competitive',
  intense: 'Intense',
};

/**
 * Generic breakdown by a nullable string field on PlayerMatchResult.
 * Skips rows where the field is null.
 */
function computeBreakdown(
  rows: PlayerMatchResult[],
  field: 'conditions' | 'court_side' | 'intensity' | 'match_type',
  labels: Record<string, string>,
): FormatBreakdown[] {
  const map = new Map<string, { total: number; wins: number }>();

  for (const row of rows) {
    const key = row[field];
    if (!key) continue;
    const entry = map.get(key) ?? { total: 0, wins: 0 };
    entry.total++;
    if (row.won) entry.wins++;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([key, entry]) => ({
      label: labels[key] ?? key,
      winRate: entry.total > 0 ? Math.round((entry.wins / entry.total) * 100) : 0,
      matchCount: entry.total,
    }))
    .sort((a, b) => b.matchCount - a.matchCount);
}

// ─── Main export ────────────────────────────────────────────────────────────

/**
 * Fetch and compute all stats for the Stats dashboard.
 * Single function, single Supabase call, all aggregation client-side.
 */
const MATCH_TYPE_LABELS: Record<string, string> = {
  competitive: 'Competitive',
  friendly: 'Friendly',
  tournament: 'Tournament',
};

/**
 * Resolve missing display names for partners/opponents by looking up profiles.
 * Mutates rows in-place for efficiency.
 */
async function resolveNames(rows: PlayerMatchResult[]): Promise<void> {
  // Collect IDs that have no name
  const missingIds = new Set<string>();
  for (const r of rows) {
    if (r.partner_id && !r.partner_name) missingIds.add(r.partner_id);
    if (r.opponent1_id && !r.opponent1_name) missingIds.add(r.opponent1_id);
    if (r.opponent2_id && !r.opponent2_name) missingIds.add(r.opponent2_id);
  }
  if (missingIds.size === 0) return;

  const ids = Array.from(missingIds);
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', ids);

  if (!data || data.length === 0) return;

  const nameMap = new Map(data.map((p: { id: string; display_name: string }) => [p.id, p.display_name]));

  for (const r of rows) {
    if (r.partner_id && !r.partner_name) {
      (r as any).partner_name = nameMap.get(r.partner_id) ?? null;
    }
    if (r.opponent1_id && !r.opponent1_name) {
      (r as any).opponent1_name = nameMap.get(r.opponent1_id) ?? null;
    }
    if (r.opponent2_id && !r.opponent2_name) {
      (r as any).opponent2_name = nameMap.get(r.opponent2_id) ?? null;
    }
  }
}

export async function fetchPlayerStats(
  userId: string,
  period: Period,
  matchType: MatchTypeFilter = 'all',
): Promise<PlayerStats> {
  const rows = await fetchResults(userId, period, matchType);

  // Resolve missing partner/opponent names from profiles
  await resolveNames(rows);

  const matchesPlayed = rows.length;
  const matchesWon = rows.filter((r) => r.won).length;
  const uniqueTournaments = new Set(rows.map((r) => r.tournament_id).filter(Boolean));

  return {
    matchesPlayed,
    matchesWon,
    winRate: matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0,
    tournamentWins: computeTournamentWins(rows),
    tournamentCount: uniqueTournaments.size,
    currentStreak: computeStreak(rows),
    recentForm: rows.slice(0, 10).map(toFormResult),
    partners: computePartners(rows),
    rivals: computeRivals(rows),
    formatBreakdown: computeFormatBreakdown(rows),
    conditionsBreakdown: computeBreakdown(rows, 'conditions', CONDITIONS_LABELS),
    courtSideBreakdown: computeBreakdown(rows, 'court_side', COURT_SIDE_LABELS),
    intensityBreakdown: computeBreakdown(rows, 'intensity', INTENSITY_LABELS),
    matchTypeBreakdown: computeBreakdown(rows, 'match_type', MATCH_TYPE_LABELS),
    winRateTrend: computeWinRateTrend(rows),
  };
}

// ─── Platform Ratings ───────────────────────────────────────────────────────

export type RatingPoint = {
  date: string;
  rating: number;
  platform: string;
};

export async function fetchPlatformRatings(
  userId: string,
  platform?: string,
): Promise<RatingPoint[]> {
  let query = supabase
    .from('platform_ratings')
    .select('platform, rating, recorded_at')
    .eq('player_id', userId)
    .order('recorded_at', { ascending: true });

  if (platform) {
    query = query.eq('platform', platform);
  }

  const { data, error } = await query;
  if (error) return []; // table may not exist yet

  return (data ?? []).map((r: { platform: string; rating: number; recorded_at: string }) => ({
    date: r.recorded_at,
    rating: Number(r.rating),
    platform: r.platform,
  }));
}

// ─── Win Rate Over Time ─────────────────────────────────────────────────────

export type WinRatePoint = {
  matchIndex: number;
  rollingWinRate: number;
  date: string;
};

export function computeWinRateTrend(
  rows: PlayerMatchResult[],
  windowSize: number = 5,
): WinRatePoint[] {
  if (rows.length === 0) return [];
  const sorted = [...rows].reverse();
  const points: WinRatePoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);
    const windowSlice = sorted.slice(windowStart, i + 1);
    const wins = windowSlice.filter((r) => r.won).length;
    const rate = Math.round((wins / windowSlice.length) * 100);
    points.push({ matchIndex: i + 1, rollingWinRate: rate, date: sorted[i].played_at });
  }

  return points;
}

// ─── Match History ──────────────────────────────────────────────────────────

export type MatchHistoryItem = {
  id: string;
  date: string;
  venue: string | null;
  won: boolean;
  teamScore: number;
  opponentScore: number;
  partnerName: string | null;
  opponent1Name: string | null;
  opponent2Name: string | null;
  matchType: string | null;
  source: string;
  platformSource: string | null;
  setScores: Array<{ team_a: number; team_b: number }> | null;
  intensity: string | null;
  conditions: string | null;
  courtSide: string | null;
};

export async function fetchMatchHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0,
  matchType: MatchTypeFilter = 'all',
): Promise<MatchHistoryItem[]> {
  let query = supabase
    .from('player_match_results')
    .select('*')
    .eq('player_id', userId)
    .order('played_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (matchType !== 'all') {
    query = query.eq('match_type', matchType);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: PlayerMatchResult) => ({
    id: r.id,
    date: r.played_at,
    venue: r.venue ?? null,
    won: r.won,
    teamScore: r.team_score,
    opponentScore: r.opponent_score,
    partnerName: r.partner_name ?? null,
    opponent1Name: r.opponent1_name ?? null,
    opponent2Name: r.opponent2_name ?? null,
    matchType: r.match_type ?? null,
    source: r.source,
    platformSource: r.platform_source ?? null,
    setScores: r.set_scores ?? null,
    intensity: r.intensity ?? null,
    conditions: r.conditions ?? null,
    courtSide: r.court_side ?? null,
  }));
}

/**
 * Update additional details on a match result (intensity, conditions, court side).
 */
export async function updateMatchDetails(
  matchId: string,
  updates: {
    intensity?: MatchIntensity | null;
    conditions?: MatchConditions | null;
    court_side?: CourtSide | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('player_match_results')
    .update(updates)
    .eq('id', matchId);
  if (error) throw error;
}

// ─── Head-to-Head ──────────────────────────────────────────────────────────

export type HeadToHeadRecord = {
  opponentId: string;
  opponentName: string;
  opponentAvatar: string | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  lastPlayed: string | null;
};

/**
 * Compute head-to-head record between the current user and a specific opponent.
 * Looks at `player_match_results` where the opponent appears as opponent1 or opponent2.
 */
export async function getHeadToHead(
  userId: string,
  opponentId: string,
): Promise<HeadToHeadRecord> {
  const { data: rows, error } = await supabase
    .from('player_match_results')
    .select('*')
    .eq('player_id', userId)
    .or(`opponent1_id.eq.${opponentId},opponent2_id.eq.${opponentId}`)
    .order('played_at', { ascending: false });

  if (error) throw error;

  const results = (rows ?? []) as PlayerMatchResult[];

  // Fetch opponent profile for name + avatar
  const { data: profileData } = await supabase
    .from('profiles')
    .select('display_name, game_face_url')
    .eq('id', opponentId)
    .single();

  let wins = 0;
  let losses = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  for (const r of results) {
    if (r.won) wins++;
    else losses++;
    pointsFor += r.team_score;
    pointsAgainst += r.opponent_score;
  }

  return {
    opponentId,
    opponentName: profileData?.display_name ?? 'Unknown',
    opponentAvatar: profileData?.game_face_url ?? null,
    matchesPlayed: results.length,
    wins,
    losses,
    pointsFor,
    pointsAgainst,
    lastPlayed: results.length > 0 ? results[0].played_at : null,
  };
}

/**
 * Batch-compute h2h records for multiple opponents in a single query.
 * More efficient than calling getHeadToHead() per opponent.
 */
export async function batchHeadToHead(
  userId: string,
  opponentIds: string[],
): Promise<Map<string, HeadToHeadRecord>> {
  if (opponentIds.length === 0) return new Map();

  // Fetch all match results for the user
  const orFilter = opponentIds
    .map((id) => `opponent1_id.eq.${id},opponent2_id.eq.${id}`)
    .join(',');

  const { data: rows, error } = await supabase
    .from('player_match_results')
    .select('*')
    .eq('player_id', userId)
    .or(orFilter)
    .order('played_at', { ascending: false });

  if (error) throw error;

  const results = (rows ?? []) as PlayerMatchResult[];

  // Fetch opponent profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, game_face_url')
    .in('id', opponentIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; display_name: string; game_face_url: string | null }) => [
      p.id,
      { name: p.display_name, avatar: p.game_face_url },
    ]),
  );

  // Aggregate per opponent
  const aggMap = new Map<
    string,
    { wins: number; losses: number; pointsFor: number; pointsAgainst: number; lastPlayed: string | null }
  >();

  for (const id of opponentIds) {
    aggMap.set(id, { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, lastPlayed: null });
  }

  for (const r of results) {
    const matchedIds = opponentIds.filter(
      (id) => r.opponent1_id === id || r.opponent2_id === id,
    );
    for (const id of matchedIds) {
      const agg = aggMap.get(id)!;
      if (r.won) agg.wins++;
      else agg.losses++;
      agg.pointsFor += r.team_score;
      agg.pointsAgainst += r.opponent_score;
      if (!agg.lastPlayed) agg.lastPlayed = r.played_at;
    }
  }

  const result = new Map<string, HeadToHeadRecord>();
  for (const id of opponentIds) {
    const agg = aggMap.get(id)!;
    const prof = profileMap.get(id);
    result.set(id, {
      opponentId: id,
      opponentName: prof?.name ?? 'Unknown',
      opponentAvatar: prof?.avatar ?? null,
      matchesPlayed: agg.wins + agg.losses,
      wins: agg.wins,
      losses: agg.losses,
      pointsFor: agg.pointsFor,
      pointsAgainst: agg.pointsAgainst,
      lastPlayed: agg.lastPlayed,
    });
  }

  return result;
}

// ─── Rivalries ─────────────────────────────────────────────────────────────

/**
 * PLA-489 / Stats 2.0 Tier 2: return the user's top rivals — opponents
 * they have played ≥2 times, sorted by total match count descending.
 *
 * Reuses `batchHeadToHead` for the W-L aggregation so this stays
 * consistent with the rivalry badges already shown on profile cards
 * and player suggestions.
 *
 * Returns an array of HeadToHeadRecord so the caller can render
 * directly without any additional shape translation.
 */
export async function fetchTopRivals(
  userId: string,
  limit = 10,
): Promise<HeadToHeadRecord[]> {
  // 1. Pull every opponent id from the user's match history in a single
  //    targeted query. We only need the two opponent columns here — no
  //    need for full result rows until we know who the top opponents are.
  const { data: rows, error } = await supabase
    .from('player_match_results')
    .select('opponent1_id, opponent2_id')
    .eq('player_id', userId);
  if (error) throw error;

  // 2. Count matches per opponent. A single match row can reference up
  //    to two opponents, so we count both.
  const counts = new Map<string, number>();
  for (const r of rows ?? []) {
    const row = r as { opponent1_id: string | null; opponent2_id: string | null };
    if (row.opponent1_id) {
      counts.set(row.opponent1_id, (counts.get(row.opponent1_id) ?? 0) + 1);
    }
    if (row.opponent2_id) {
      counts.set(row.opponent2_id, (counts.get(row.opponent2_id) ?? 0) + 1);
    }
  }

  // 3. Filter to opponents the user has played ≥2 times — a single
  //    match isn't a rivalry, it's a one-off. Sort by match count
  //    descending and trim to the limit.
  const topIds = Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  // 4. Call the existing batch H2H aggregator to get W-L records for
  //    the top opponents. This reuses the same service that renders
  //    the rivalry badges elsewhere in the app, so the numbers stay
  //    consistent across surfaces.
  const h2hMap = await batchHeadToHead(userId, topIds);

  // 5. Return in the same order as topIds (most-played first), keeping
  //    any opponent whose record came back non-null.
  return topIds
    .map((id) => h2hMap.get(id))
    .filter((r): r is HeadToHeadRecord => r !== undefined);
}
