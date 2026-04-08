/**
 * Match Record Service
 *
 * Manages standalone match records (not tournament matches).
 * Creates entries in match_records + match_scores, and syncs
 * to player_match_results for backward compatibility with Stats.
 */

import { supabase } from '../lib/supabase';
import type { MatchRecord, MatchScore } from '../lib/types';

type NewMatchRecord = Omit<MatchRecord, 'id' | 'created_at'>;
type NewMatchScore = Omit<MatchScore, 'id' | 'match_record_id'>;

/**
 * Create a match record with set scores.
 * Also syncs to player_match_results for backward compatibility.
 */
export async function createMatchRecord(
  record: NewMatchRecord,
  scores: NewMatchScore[],
): Promise<string> {
  // Insert the match record
  const { data: matchData, error: matchError } = await supabase
    .from('match_records')
    .insert(record)
    .select('id')
    .single();

  if (matchError) throw matchError;
  const matchRecordId = matchData.id;

  // Insert set scores
  if (scores.length > 0) {
    const scoreRows = scores.map((s) => ({
      match_record_id: matchRecordId,
      set_number: s.set_number,
      team_a_score: s.team_a_score,
      team_b_score: s.team_b_score,
    }));

    const { error: scoreError } = await supabase
      .from('match_scores')
      .insert(scoreRows);

    if (scoreError) throw scoreError;
  }

  // Sync to player_match_results for Stats backward compat
  await syncToPlayerMatchResults(matchRecordId, record, scores);

  return matchRecordId;
}

/**
 * Populate player_match_results so the Stats dashboard stays accurate.
 */
async function syncToPlayerMatchResults(
  matchRecordId: string,
  record: NewMatchRecord,
  scores: NewMatchScore[],
): Promise<void> {
  // Compute totals from set scores
  const teamTotal = scores.reduce((sum, s) => sum + s.team_a_score, 0);
  const oppTotal = scores.reduce((sum, s) => sum + s.team_b_score, 0);
  const won = teamTotal > oppTotal;

  const setScoresFormatted = scores.map((s) => ({
    team_a: s.team_a_score,
    team_b: s.team_b_score,
  }));

  const { error } = await supabase.from('player_match_results').insert({
    player_id: record.creator_id,
    partner_id: record.partner_id,
    opponent1_id: record.opponent1_id,
    opponent2_id: record.opponent2_id,
    partner_name: record.partner_name,
    opponent1_name: record.opponent1_name,
    opponent2_name: record.opponent2_name,
    team_score: teamTotal,
    opponent_score: oppTotal,
    won,
    source: 'manual',
    match_type: record.match_type,
    venue: record.venue,
    set_scores: setScoresFormatted.length > 0 ? setScoresFormatted : null,
    played_at: record.played_at,
  });

  if (error) {
    // Non-fatal: log but don't block the match record creation
    console.warn('Failed to sync to player_match_results:', error.message);
  }
}

/**
 * Fetch recent match records for the current user.
 */
export async function getRecentMatchRecords(
  userId: string,
  limit = 10,
): Promise<MatchRecord[]> {
  const { data, error } = await supabase
    .from('match_records')
    .select('*')
    .eq('creator_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
