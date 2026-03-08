/**
 * useTournamentClock — Synced Countdown Timer
 *
 * Computes remaining time locally from tournament's `current_round_started_at`
 * + `current_round_duration_seconds`. All players see the same countdown
 * because they share the same source timestamps via Realtime.
 *
 * Ported from deuce-switch-web/src/features/americano/hooks/useTournamentClock.ts
 */

import { useEffect, useState, useMemo } from 'react';
import type { Tournament } from '../lib/types';

type UseTournamentClockReturn = {
  secondsLeft: number;
  formattedTime: string;
  isRunning: boolean;
  isExpired: boolean;
};

export function useTournamentClock(
  tournament: Tournament | null,
): UseTournamentClockReturn {
  const [secondsLeft, setSecondsLeft] = useState(0);

  const clockRunning = tournament?.master_clock_running ?? false;
  const roundStartedAt = tournament?.current_round_started_at ?? null;
  const roundDuration = tournament?.current_round_duration_seconds ?? 0;

  useEffect(() => {
    // Clock paused — show frozen time
    if (!clockRunning || !roundStartedAt) {
      if (!clockRunning && roundStartedAt && roundDuration > 0) {
        const started = new Date(roundStartedAt).getTime();
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSecondsLeft(Math.max(roundDuration - elapsed, 0));
      } else if (!roundStartedAt) {
        setSecondsLeft(roundDuration);
      }
      return;
    }

    // Clock running — tick every second
    const started = new Date(roundStartedAt).getTime();

    const tick = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSecondsLeft(Math.max(roundDuration - elapsed, 0));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [clockRunning, roundStartedAt, roundDuration]);

  const formattedTime = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [secondsLeft]);

  return {
    secondsLeft,
    formattedTime,
    isRunning: clockRunning,
    isExpired: secondsLeft === 0 && clockRunning,
  };
}
