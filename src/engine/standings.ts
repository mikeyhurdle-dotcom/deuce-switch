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
  // Players who sit out a round receive the average *individual* score
  // from that round. Each match contributes 2 individual scores per team
  // (teamAScore for each player on team A, teamBScore for each on team B).
  // ── Bye round average scoring (supports multiple byes per round) ──
  // Collect per-round scoring data and ALL bye players (not just one)
  const roundMap = new Map<
    number,
    { playerScoreSum: number; individualCount: number; byePlayerIds: string[] }
  >();

  // First pass: compute per-round averages
  matches.forEach((m) => {
    const res = resultsByMatch.get(m.id);
    if (!res) return;
    const round = m.roundNumber;
    const entry = roundMap.get(round) ?? { playerScoreSum: 0, individualCount: 0, byePlayerIds: [] };
    const teamACount = m.teamA.length;
    const teamBCount = m.teamB.length;
    entry.playerScoreSum += res.teamAScore * teamACount + res.teamBScore * teamBCount;
    entry.individualCount += teamACount + teamBCount;
    if (m.byePlayerId && !entry.byePlayerIds.includes(m.byePlayerId)) {
      entry.byePlayerIds.push(m.byePlayerId);
    }
    roundMap.set(round, entry);
  });

  // Second pass: find all players who sat out each round (not in any match)
  const roundNumbers = [...new Set(matches.map((m) => m.roundNumber))];
  for (const round of roundNumbers) {
    const entry = roundMap.get(round);
    if (!entry) continue;
    const playersInRound = new Set<string>();
    matches
      .filter((m) => m.roundNumber === round)
      .forEach((m) => {
        m.teamA.forEach((id) => playersInRound.add(id));
        m.teamB.forEach((id) => playersInRound.add(id));
      });
    // Any player not in any match this round is a bye player
    for (const p of players) {
      if (!playersInRound.has(p.id) && !entry.byePlayerIds.includes(p.id)) {
        entry.byePlayerIds.push(p.id);
      }
    }
  }

  roundMap.forEach((roundData) => {
    if (roundData.byePlayerIds.length === 0 || roundData.individualCount === 0) return;
    const avgScore = Math.round(roundData.playerScoreSum / roundData.individualCount);
    for (const byeId of roundData.byePlayerIds) {
      const s = stats.get(byeId);
      if (!s) continue;
      s.pointsFor += avgScore;
      s.pointsAgainst += avgScore; // Balanced: bye player also receives avg against
      s.matchesPlayed += 1;
      s.draws += 1;
    }
  });

  // Build final standings array
  const standings: AmericanoStanding[] = players.map((p) => {
    const s = stats.get(p.id) ?? {
      pointsFor: 0, pointsAgainst: 0, matchesPlayed: 0,
      wins: 0, losses: 0, draws: 0,
    };
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
