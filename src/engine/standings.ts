/**
 * Americano Standings Computation
 *
 * Pure function — no Supabase dependency. Computes live standings
 * from players, matches, and results. Includes bye-round average scoring.
 *
 * Ported from deuce-switch-web/src/features/americano/lib/americano.ts
 */

import type {
  AmericanoPlayer,
  AmericanoMatch,
  AmericanoResult,
  AmericanoStanding,
} from '../lib/types';

export function computeStandings(
  players: AmericanoPlayer[],
  results: AmericanoResult[],
  matches: AmericanoMatch[],
): AmericanoStanding[] {
  const stats = new Map<
    string,
    {
      pointsFor: number;
      pointsAgainst: number;
      matchesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
    }
  >();

  players.forEach((p) => {
    stats.set(p.id, {
      pointsFor: 0,
      pointsAgainst: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    });
  });

  const resultsByMatch = new Map<string, AmericanoResult>();
  results.forEach((r) => resultsByMatch.set(r.matchId, r));

  matches.forEach((m) => {
    const res = resultsByMatch.get(m.id);
    if (!res) return;

    const { teamAScore, teamBScore } = res;
    const isAWin = teamAScore > teamBScore;
    const isBWin = teamBScore > teamAScore;
    const isDraw = teamAScore === teamBScore;

    const updateTeam = (
      team: string[],
      scored: number,
      conceded: number,
      isWin: boolean,
      isLoss: boolean,
      draw: boolean,
    ) => {
      team.forEach((pid) => {
        const s = stats.get(pid);
        if (!s) return;
        s.pointsFor += scored;
        s.pointsAgainst += conceded;
        s.matchesPlayed += 1;
        if (isWin) s.wins += 1;
        else if (isLoss) s.losses += 1;
        else if (draw) s.draws += 1;
      });
    };

    updateTeam(m.teamA, teamAScore, teamBScore, isAWin, isBWin, isDraw);
    updateTeam(m.teamB, teamBScore, teamAScore, isBWin, isAWin, isDraw);
  });

  // ── Bye round average scoring ──
  // Players who sit out a round receive the average score from that round
  const roundMap = new Map<
    number,
    { totalPoints: number; playerCount: number; byePlayerId?: string }
  >();

  matches.forEach((m) => {
    const res = resultsByMatch.get(m.id);
    if (!res) return;
    const round = m.roundNumber;
    const entry = roundMap.get(round) ?? { totalPoints: 0, playerCount: 0 };
    const playersInMatch = [...m.teamA, ...m.teamB].length;
    entry.totalPoints += res.teamAScore + res.teamBScore;
    entry.playerCount += playersInMatch;
    if (m.byePlayerId) entry.byePlayerId = m.byePlayerId;
    roundMap.set(round, entry);
  });

  roundMap.forEach((roundData) => {
    if (!roundData.byePlayerId || roundData.playerCount === 0) return;
    const avgScore = Math.round(roundData.totalPoints / roundData.playerCount);
    const s = stats.get(roundData.byePlayerId);
    if (!s) return;
    s.pointsFor += avgScore;
    // Bye counts as a draw for fairness
    s.matchesPlayed += 1;
    s.draws += 1;
  });

  // Build final standings array
  const standings: AmericanoStanding[] = players.map((p) => {
    const s = stats.get(p.id)!;
    const total = s.wins + s.losses + s.draws;
    return {
      playerId: p.id,
      displayName: p.displayName,
      gameFaceUrl: p.gameFaceUrl,
      ...s,
      winRate: total === 0 ? 0 : s.wins / total,
    };
  });

  // Sort: points descending, then win rate, then name
  standings.sort((a, b) => {
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return a.displayName.localeCompare(b.displayName);
  });

  return standings;
}
