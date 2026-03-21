/**
 * Tournament Service
 *
 * Bridges the pure Americano engine with Supabase. Handles match generation,
 * round advancement, clock control, and tournament lifecycle operations.
 */

import { randomUUID } from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { generateAmericanoRounds } from '../engine/americano';
import type {
  Tournament,
  Match,
  TournamentPlayer,
  AmericanoPlayer,
} from '../lib/types';

// ─── Tournament Lifecycle ────────────────────────────────────────────────────

export async function getTournament(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Tournament;
}

export async function getPlayersForTournament(
  tournamentId: string,
): Promise<TournamentPlayer[]> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('tournament_status', 'active');
  if (error) throw error;
  return (data ?? []) as TournamentPlayer[];
}

export async function getPlayerProfiles(
  tournamentId: string,
): Promise<AmericanoPlayer[]> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select('player_id, profiles(display_name, game_face_url)')
    .eq('tournament_id', tournamentId)
    .eq('tournament_status', 'active');
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.player_id,
    displayName: p.profiles?.display_name ?? 'Player',
    gameFaceUrl: p.profiles?.game_face_url ?? null,
  }));
}

// ─── Add Guest Player ────────────────────────────────────────────────────────

/**
 * Creates a ghost profile for a guest player and adds them to the tournament.
 * Ghost profiles have is_ghost = true and can be claimed later.
 */
export async function addGuestPlayer(
  tournamentId: string,
  displayName: string,
): Promise<string> {
  // 1. Create a ghost profile (profiles.id has no default — supply a UUID)
  const ghostId = randomUUID();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: ghostId,
      display_name: displayName.trim(),
      is_ghost: true,
    })
    .select('id')
    .single();
  if (profileError) throw profileError;

  // 2. Add to tournament_players
  const { error: tpError } = await supabase
    .from('tournament_players')
    .insert({
      tournament_id: tournamentId,
      player_id: profile.id,
      tournament_status: 'active',
    });
  if (tpError) throw tpError;

  return profile.id;
}

// ─── Start Tournament (generate all rounds + matches) ────────────────────────

export async function startTournament(tournamentId: string): Promise<void> {
  // 1. Get active players
  const players = await getPlayerProfiles(tournamentId);
  if (players.length < 4) {
    throw new Error('Need at least 4 players to start');
  }

  // 2. Generate all rounds using the Americano engine
  const playerIds = players.map((p) => p.id);
  const engineMatches = generateAmericanoRounds(playerIds);

  // 3. Insert matches into Supabase
  const matchRows = engineMatches.map((m) => ({
    tournament_id: tournamentId,
    round_number: m.roundNumber,
    court_number: m.courtNumber ?? null,
    player1_id: m.teamA[0] ?? null,
    player2_id: m.teamA[1] ?? null,
    player3_id: m.teamB[0] ?? null,
    player4_id: m.teamB[1] ?? null,
    bye_player_id: m.byePlayerId ?? null,
    status: 'pending' as const,
  }));

  const { error: insertError } = await supabase
    .from('matches')
    .insert(matchRows);
  if (insertError) throw insertError;

  // 4. Get the tournament to read time_per_round_seconds
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  // 5. Update tournament status to running, set round 1
  const { error: updateError } = await supabase
    .from('tournaments')
    .update({
      status: 'running',
      current_round: 1,
      current_round_started_at: new Date().toISOString(),
      current_round_duration_seconds: tournament.time_per_round_seconds,
      master_clock_running: true,
    })
    .eq('id', tournamentId);
  if (updateError) throw updateError;
}

// ─── Round Management ────────────────────────────────────────────────────────

export async function advanceRound(tournamentId: string): Promise<void> {
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const nextRound = (tournament.current_round ?? 1) + 1;

  // Check if next round has matches
  const { data: nextMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('round_number', nextRound);

  if (!nextMatches || nextMatches.length === 0) {
    throw new Error('No more rounds — tournament is complete');
  }

  const { error } = await supabase
    .from('tournaments')
    .update({
      current_round: nextRound,
      current_round_started_at: new Date().toISOString(),
      current_round_duration_seconds: tournament.time_per_round_seconds,
      master_clock_running: true,
    })
    .eq('id', tournamentId);
  if (error) throw error;

  // Fire server-side push (non-blocking)
  triggerPushNotification(tournamentId, tournament.name, 'round_started', nextRound);
}

export async function endTournament(tournamentId: string): Promise<void> {
  // 0. Fetch tournament name for push notification
  const tournament = await getTournament(tournamentId);

  // 1. Batch-approve all reported matches so the DB trigger
  //    (record_match_results_from_match) fires and syncs player stats
  //    to profiles.matches_played / matches_won + player_match_results.
  const { error: approveError } = await supabase
    .from('matches')
    .update({ status: 'approved' })
    .eq('tournament_id', tournamentId)
    .eq('status', 'reported');
  if (approveError) throw approveError;

  // 2. Mark tournament complete and stop the clock
  const { error } = await supabase
    .from('tournaments')
    .update({
      status: 'completed',
      master_clock_running: false,
    })
    .eq('id', tournamentId);
  if (error) throw error;

  // 3. Fire server-side push (non-blocking)
  if (tournament) {
    triggerPushNotification(tournamentId, tournament.name, 'tournament_completed');
  }
}

// ─── Clock Control ───────────────────────────────────────────────────────────

export async function startClock(tournamentId: string): Promise<void> {
  const tournament = await getTournament(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const update: Record<string, any> = {
    master_clock_running: true,
  };

  // If no start time yet, set it now
  if (!tournament.current_round_started_at) {
    update.current_round_started_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('tournaments')
    .update(update)
    .eq('id', tournamentId);
  if (error) throw error;
}

export async function pauseClock(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ master_clock_running: false })
    .eq('id', tournamentId);
  if (error) throw error;
}

export async function resetClock(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({
      current_round_started_at: new Date().toISOString(),
      master_clock_running: false,
    })
    .eq('id', tournamentId);
  if (error) throw error;
}

// ─── Server-Side Push (via Edge Function) ────────────────────────────────────

/**
 * Trigger server-side push notification via Supabase Edge Function.
 * Non-blocking — fails silently if edge function isn't deployed yet.
 */
export async function triggerPushNotification(
  tournamentId: string,
  tournamentName: string,
  event: 'round_started' | 'tournament_completed',
  roundNumber?: number,
): Promise<void> {
  try {
    await supabase.functions.invoke('push-round-advanced', {
      body: {
        tournament_id: tournamentId,
        tournament_name: tournamentName,
        event,
        round_number: roundNumber,
      },
    });
  } catch {
    // Edge function may not be deployed — fail silently for MVP
    console.warn('[push] Edge function call failed — notifications skipped');
  }
}

// ─── Match Queries ───────────────────────────────────────────────────────────

export async function getMatchesForTournament(
  tournamentId: string,
): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number')
    .order('court_number');
  if (error) throw error;
  return (data ?? []) as Match[];
}

export async function getMatchesForRound(
  tournamentId: string,
  roundNumber: number,
): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber)
    .order('court_number');
  if (error) throw error;
  return (data ?? []) as Match[];
}

// ─── Score Operations ────────────────────────────────────────────────────────

export type ScoreMetadata = {
  conditions?: 'indoor' | 'outdoor' | null;
  court_side?: 'left' | 'right' | 'both' | null;
  intensity?: 'casual' | 'competitive' | 'intense' | null;
};

export async function submitScore(
  matchId: string,
  teamAScore: number,
  teamBScore: number,
  metadata?: ScoreMetadata,
): Promise<void> {
  // Optimistic locking: only update if the match is still pending or in_progress
  const { data, error } = await supabase
    .from('matches')
    .update({
      team_a_score: teamAScore,
      team_b_score: teamBScore,
      status: 'reported',
      ...(metadata?.conditions && { conditions: metadata.conditions }),
      ...(metadata?.court_side && { court_side: metadata.court_side }),
      ...(metadata?.intensity && { intensity: metadata.intensity }),
    })
    .eq('id', matchId)
    .in('status', ['pending', 'in_progress'])
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error('Score already submitted for this match. Pull to refresh.');
  }
}

export async function overrideScore(
  matchId: string,
  teamAScore: number,
  teamBScore: number,
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({
      team_a_score: teamAScore,
      team_b_score: teamBScore,
      status: 'approved',
    })
    .eq('id', matchId);
  if (error) throw error;
}

export async function getTotalRounds(tournamentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('matches')
    .select('round_number')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.round_number ?? 0;
}
