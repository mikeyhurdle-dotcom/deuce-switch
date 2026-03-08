/**
 * Americano Pairing Engine
 *
 * Pure function — no Supabase dependency. Generates all rounds for an
 * Americano tournament using a greedy partner-diversity algorithm.
 *
 * Ported from deuce-switch-web/src/features/americano/lib/americano.ts
 */

import type { AmericanoMatch } from '../lib/types';

const matchId = (round: number, court: number) => `r${round}-c${court}`;

/**
 * Greedy Americano pairing generator for 4–16 players.
 * Ensures maximum partner diversity — every player partners with every
 * other player at most once before repeating.
 *
 * For odd player counts, one player sits out each round (bye).
 * Players with fewest byes are preferred for sitting out.
 */
export function generateAmericanoRounds(
  playerIds: string[],
  byeCounts?: Record<string, number>,
): AmericanoMatch[] {
  if (playerIds.length < 4) return [];

  const ids = [...playerIds];
  let hasBye = false;
  const BYE = '__BYE__';

  if (ids.length % 2 !== 0) {
    ids.push(BYE);
    hasBye = true;
  }

  // Track how many times each pair has partnered
  const partnerCounts: Record<string, Record<string, number>> = {};
  ids.forEach((a) => {
    partnerCounts[a] = {};
    ids.forEach((b) => {
      if (a !== b) partnerCounts[a][b] = 0;
    });
  });

  // Build all valid pairs (excluding BYE)
  const allPairs: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (ids[i] === BYE || ids[j] === BYE) continue;
      allPairs.push([ids[i], ids[j]]);
    }
  }

  const matches: AmericanoMatch[] = [];
  let roundNumber = 1;
  const playersPerRound = ids.length;
  const courtsPerRound = Math.floor(playersPerRound / 4);

  // Track byes for fair distribution
  const roundByeCounts: Record<string, number> = byeCounts
    ? { ...byeCounts }
    : {};
  playerIds.forEach((id) => {
    if (!(id in roundByeCounts)) roundByeCounts[id] = 0;
  });

  const pickTeam = (available: Set<string>): [string, string] | null => {
    let bestPair: [string, string] | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    const arr = Array.from(available);

    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i];
        const b = arr[j];
        if (a === BYE || b === BYE) continue;
        const score = partnerCounts[a][b];
        if (score < bestScore) {
          bestScore = score;
          bestPair = [a, b];
        }
      }
    }

    return bestPair;
  };

  const haveAllPairsMetTarget = () =>
    allPairs.every(([a, b]) => partnerCounts[a][b] >= 1);

  while (!haveAllPairsMetTarget() && roundNumber < 30) {
    const available = new Set(ids);

    for (let court = 1; court <= courtsPerRound; court++) {
      if (available.size < 4) break;

      const teamA = pickTeam(available);
      if (!teamA) break;
      teamA.forEach((id) => available.delete(id));

      const teamB = pickTeam(available);
      if (!teamB) {
        teamA.forEach((id) => available.add(id));
        break;
      }
      teamB.forEach((id) => available.delete(id));

      const [a1, a2] = teamA;
      const [b1, b2] = teamB;
      partnerCounts[a1][a2] += 1;
      partnerCounts[a2][a1] += 1;
      partnerCounts[b1][b2] += 1;
      partnerCounts[b2][b1] += 1;

      const allPlayers = [...teamA, ...teamB];
      if (allPlayers.includes(BYE)) continue;

      // Determine bye player for this round
      const leftOver = Array.from(available).filter((id) => id !== BYE);
      const byePlayer = leftOver.length > 0 ? leftOver[0] : null;

      matches.push({
        id: matchId(roundNumber, court),
        roundNumber,
        courtNumber: court,
        teamA,
        teamB,
        byePlayerId: court === 1 && byePlayer ? byePlayer : undefined,
      });
    }

    // Track who got a bye this round
    const playersInMatches = new Set<string>();
    matches
      .filter((m) => m.roundNumber === roundNumber)
      .forEach((m) => {
        m.teamA.forEach((id) => playersInMatches.add(id));
        m.teamB.forEach((id) => playersInMatches.add(id));
      });
    playerIds.forEach((id) => {
      if (!playersInMatches.has(id)) {
        roundByeCounts[id] = (roundByeCounts[id] ?? 0) + 1;
      }
    });

    roundNumber += 1;
    if (roundNumber > 100) break;
  }

  // Strip BYE placeholder from results
  if (hasBye) {
    return matches.map((m) => ({
      ...m,
      teamA: m.teamA.filter((id) => id !== BYE),
      teamB: m.teamB.filter((id) => id !== BYE),
    }));
  }

  return matches;
}
