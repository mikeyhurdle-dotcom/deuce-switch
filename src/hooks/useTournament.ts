/**
 * useTournament — Single Source of Truth
 *
 * Subscribes to ALL tournament-related tables via Supabase Realtime.
 * Both organiser and player views read from this one hook.
 * No polling, no manual refresh — fully reactive.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { computeStandings } from '../engine/standings';
import type {
  Tournament,
  Match,
  TournamentPlayer,
  AmericanoPlayer,
  AmericanoMatch,
  AmericanoResult,
  AmericanoStanding,
} from '../lib/types';

type PlayerProfile = {
  playerId: string;
  displayName: string;
  gameFaceUrl: string | null;
};

type UseTournamentReturn = {
  tournament: Tournament | null;
  matches: Match[];
  players: PlayerProfile[];
  standings: AmericanoStanding[];
  currentRoundMatches: Match[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useTournament(tournamentId: string | null): UseTournamentReturn {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ─── Fetch All Data ──────────────────────────────────────────────────────────

  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;
    const { data, error: err } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();
    if (err) throw err;
    if (mountedRef.current && data) setTournament(data as Tournament);
  }, [tournamentId]);

  const fetchMatches = useCallback(async () => {
    if (!tournamentId) return;
    const { data, error: err } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number')
      .order('court_number');
    if (err) throw err;
    if (mountedRef.current) setMatches((data ?? []) as Match[]);
  }, [tournamentId]);

  const fetchPlayers = useCallback(async () => {
    if (!tournamentId) return;
    const { data, error: err } = await supabase
      .from('tournament_players')
      .select('player_id, profiles(display_name, game_face_url)')
      .eq('tournament_id', tournamentId)
      .eq('tournament_status', 'active');
    if (err) throw err;
    if (mountedRef.current) {
      setPlayers(
        (data ?? []).map((p: any) => ({
          playerId: p.player_id,
          displayName: p.profiles?.display_name ?? 'Player',
          gameFaceUrl: p.profiles?.game_face_url ?? null,
        })),
      );
    }
  }, [tournamentId]);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      await Promise.all([fetchTournament(), fetchMatches(), fetchPlayers()]);
    } catch (err: unknown) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchTournament, fetchMatches, fetchPlayers]);

  // ─── Initial Load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Timeout guard: if initial fetch takes >10s, stop spinner and show error
    const timeout = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false);
        setError('Loading timed out — pull down to retry.');
      }
    }, 10_000);

    refetch().finally(() => clearTimeout(timeout));
  }, [tournamentId]);

  // ─── Realtime Subscriptions ──────────────────────────────────────────────────

  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`tournament-all:${tournamentId}`)
      // Tournament row changes (status, clock, round)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          if (mountedRef.current && payload.new) {
            setTournament(payload.new as Tournament);
          }
        },
      )
      // Match changes (scores, status)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          if (!mountedRef.current) return;
          if (payload.eventType === 'INSERT') {
            setMatches((prev) => {
              const incoming = payload.new as Match;
              if (prev.some((m) => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMatches((prev) =>
              prev.map((m) =>
                m.id === (payload.new as Match).id
                  ? (payload.new as Match)
                  : m,
              ),
            );
          } else if (payload.eventType === 'DELETE') {
            setMatches((prev) =>
              prev.filter((m) => m.id !== (payload.old as any).id),
            );
          }
        },
      )
      // Player changes (joins, drops)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_players',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          // Refetch players since we need profile join data
          if (mountedRef.current) fetchPlayers();
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Reconnect by refetching
          if (mountedRef.current) refetch();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  // ─── Computed: Standings ─────────────────────────────────────────────────────

  const standings: AmericanoStanding[] = (() => {
    if (players.length === 0) return [];

    const enginePlayers: AmericanoPlayer[] = players.map((p) => ({
      id: p.playerId,
      displayName: p.displayName,
      gameFaceUrl: p.gameFaceUrl,
    }));

    const engineMatches: AmericanoMatch[] = matches.map((m) => ({
      id: m.id,
      roundNumber: m.round_number,
      courtNumber: m.court_number ?? undefined,
      teamA: [m.player1_id, m.player2_id].filter(Boolean),
      teamB: [m.player3_id, m.player4_id].filter(Boolean),
      byePlayerId: m.bye_player_id,
    }));

    const engineResults: AmericanoResult[] = matches
      .filter((m) => m.team_a_score != null && m.team_b_score != null)
      .map((m) => ({
        matchId: m.id,
        teamAScore: m.team_a_score!,
        teamBScore: m.team_b_score!,
      }));

    return computeStandings(enginePlayers, engineResults, engineMatches, tournament?.ranking_mode);
  })();

  // ─── Computed: Current Round Matches ─────────────────────────────────────────

  const currentRound = tournament?.current_round ?? 1;
  const currentRoundMatches = matches.filter(
    (m) => m.round_number === currentRound,
  );

  return {
    tournament,
    matches,
    players,
    standings,
    currentRoundMatches,
    loading,
    error,
    refetch,
  };
}
