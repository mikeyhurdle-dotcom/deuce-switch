/**
 * Match Import Service
 *
 * Handles saving OCR-extracted match data into player_match_results
 * and platform_ratings. Supports batch import, profile matching,
 * and undo (delete by batch).
 *
 * "Life before death, strength before weakness, journey before destination."
 */

import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type {
  Profile,
  MatchType,
  MatchConditions,
  CourtSide,
  MatchIntensity,
  SetScore,
  DetectedPlatform,
} from '../lib/types';

// ─── Public Types ───────────────────────────────────────────────────────────

export type ConfirmedMatch = {
  date: string | null;
  time: string | null;
  venue: string | null;
  platform_source: DetectedPlatform;
  sets: SetScore[];
  team_a_players: { name: string; profileId: string | null }[];
  team_b_players: { name: string; profileId: string | null }[];
  user_team: 'a' | 'b';
  won: boolean;
  match_type: MatchType;
  court_side: CourtSide | null;
  intensity: MatchIntensity | null;
  conditions: MatchConditions | null;
  score_edited: boolean;
  ratings: Record<string, number>;
};

export type ImportResult = {
  saved: number;
  batchId: string;
  ratingsRecorded: number;
};

// ─── Profile Matching ───────────────────────────────────────────────────────

/**
 * Fuzzy-match an array of player names against the profiles table.
 * Checks display_name, username, and platform-specific name columns.
 * Returns a Map from name → matched Profile or null.
 */
export async function matchPlayerProfiles(
  names: string[],
  platform?: DetectedPlatform,
): Promise<Map<string, Profile | null>> {
  const results = new Map<string, Profile | null>();

  // Deduplicate names
  const uniqueNames = [...new Set(names.map((n) => n.trim()))];

  for (const name of uniqueNames) {
    if (!name) {
      results.set(name, null);
      continue;
    }

    // Build OR filter: display_name or username match
    let orFilter = `display_name.ilike.%${name}%,username.ilike.%${name}%`;

    // Also check platform-specific name column if platform is known
    if (platform && platform !== 'unknown') {
      const colName = `${platform}_name`;
      orFilter += `,${colName}.ilike.%${name}%`;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .or(orFilter)
      .limit(5);

    if (!profiles || profiles.length === 0) {
      results.set(name, null);
      continue;
    }

    // Prefer exact match on display_name, then partial
    const exact = profiles.find(
      (p) => p.display_name?.toLowerCase() === name.toLowerCase(),
    );
    results.set(name, (exact ?? profiles[0]) as Profile);
  }

  return results;
}

// ─── Batch Save ─────────────────────────────────────────────────────────────

/**
 * Save confirmed matches into player_match_results and platform_ratings.
 * All matches in the batch share an import_batch_id for undo capability.
 */
export async function saveImportedMatches(
  userId: string,
  matches: ConfirmedMatch[],
): Promise<ImportResult> {
  const batchId = randomUUID();
  let saved = 0;
  let ratingsRecorded = 0;

  for (const match of matches) {
    // Determine scores from sets
    const teamATotal = match.sets.reduce((sum, s) => sum + s.team_a, 0);
    const teamBTotal = match.sets.reduce((sum, s) => sum + s.team_b, 0);

    const isUserTeamA = match.user_team === 'a';
    const teamScore = isUserTeamA ? teamATotal : teamBTotal;
    const opponentScore = isUserTeamA ? teamBTotal : teamATotal;

    // Resolve partner and opponents
    const userTeam = isUserTeamA ? match.team_a_players : match.team_b_players;
    const oppTeam = isUserTeamA ? match.team_b_players : match.team_a_players;

    // Partner is the other player on user's team (if doubles)
    const partner = userTeam.find((p) => p.profileId !== userId) ?? userTeam[0];
    const opp1 = oppTeam[0];
    const opp2 = oppTeam[1];

    // Build played_at timestamp — handle non-ISO date strings from OCR
    let playedAt: string;
    if (match.date) {
      const timeStr = match.time ?? '12:00';
      let parsed = new Date(`${match.date}T${timeStr}:00`);
      // Fallback: if ISO-style parse fails, try Date.parse on the raw date string
      if (isNaN(parsed.getTime())) {
        parsed = new Date(match.date);
      }
      // Final fallback: use current time if all parsing fails
      playedAt = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    } else {
      playedAt = new Date().toISOString();
    }

    const { data: inserted, error } = await supabase
      .from('player_match_results')
      .insert({
        player_id: userId,
        tournament_id: null,
        match_id: null,
        partner_id: partner?.profileId ?? null,
        opponent1_id: opp1?.profileId ?? null,
        opponent2_id: opp2?.profileId ?? null,
        partner_name: partner?.name ?? null,
        opponent1_name: opp1?.name ?? null,
        opponent2_name: opp2?.name ?? null,
        team_score: teamScore,
        opponent_score: opponentScore,
        won: match.won,
        source: 'screenshot' as const,
        match_type: match.match_type,
        platform_source: match.platform_source === 'unknown' ? null : match.platform_source,
        venue: match.venue,
        set_scores: match.sets,
        import_batch_id: batchId,
        score_edited: match.score_edited,
        conditions: match.conditions,
        court_side: match.court_side,
        intensity: match.intensity,
        played_at: playedAt,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to insert match result:', error);
      continue;
    }

    saved++;

    // Save platform ratings if available
    if (inserted && match.ratings && Object.keys(match.ratings).length > 0) {
      // Find user's rating — check by matching user's name in the ratings object
      const userNames = userTeam.map((p) => p.name.toLowerCase());
      for (const [playerName, rating] of Object.entries(match.ratings)) {
        if (userNames.some((n) => playerName.toLowerCase().includes(n) || n.includes(playerName.toLowerCase()))) {
          const platformStr = match.platform_source === 'unknown' ? null : match.platform_source;
          if (platformStr) {
            const { error: ratingError } = await supabase
              .from('platform_ratings')
              .insert({
                player_id: userId,
                platform: platformStr,
                rating,
                rating_label: platformStr === 'padelmates' ? 'ELO' : 'Level',
                match_result_id: inserted.id,
                recorded_at: playedAt,
              });

            if (!ratingError) ratingsRecorded++;
          }
          break; // Only record one rating per match for the user
        }
      }
    }
  }

  // Update aggregate stats on the user's profile
  if (saved > 0) {
    const winsCount = matches.filter((m) => m.won).length;
    const { error: profileError } = await supabase.rpc('increment_profile_stats', {
      p_user_id: userId,
      p_matches: saved,
      p_wins: winsCount,
    });

    // Fallback: manual increment if RPC doesn't exist yet
    if (profileError) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('matches_played, matches_won')
        .eq('id', userId)
        .single();

      if (currentProfile) {
        await supabase
          .from('profiles')
          .update({
            matches_played: currentProfile.matches_played + saved,
            matches_won: currentProfile.matches_won + winsCount,
          })
          .eq('id', userId);
      }
    }
  }

  return { saved, batchId, ratingsRecorded };
}

// ─── Undo Import ────────────────────────────────────────────────────────────

/**
 * Delete all matches from a specific import batch.
 * Also removes associated platform_ratings and decrements profile stats.
 */
export async function deleteImportBatch(
  userId: string,
  batchId: string,
): Promise<{ deleted: number }> {
  // First, count what we're about to delete for profile stats adjustment
  const { data: batchRows } = await supabase
    .from('player_match_results')
    .select('id, won')
    .eq('player_id', userId)
    .eq('import_batch_id', batchId);

  if (!batchRows || batchRows.length === 0) {
    return { deleted: 0 };
  }

  const matchCount = batchRows.length;
  const winCount = batchRows.filter((r) => r.won).length;
  const matchIds = batchRows.map((r) => r.id);

  // Delete associated platform ratings first (FK reference)
  await supabase
    .from('platform_ratings')
    .delete()
    .in('match_result_id', matchIds);

  // Delete the match results
  const { error } = await supabase
    .from('player_match_results')
    .delete()
    .eq('player_id', userId)
    .eq('import_batch_id', batchId);

  if (error) {
    console.error('Failed to delete import batch:', error);
    return { deleted: 0 };
  }

  // Decrement profile stats
  const { data: profile } = await supabase
    .from('profiles')
    .select('matches_played, matches_won')
    .eq('id', userId)
    .single();

  if (profile) {
    await supabase
      .from('profiles')
      .update({
        matches_played: Math.max(0, profile.matches_played - matchCount),
        matches_won: Math.max(0, profile.matches_won - winCount),
      })
      .eq('id', userId);
  }

  return { deleted: matchCount };
}
