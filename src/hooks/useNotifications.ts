/**
 * useNotifications — Tournament Event Notification Hook
 *
 * Watches tournament state changes via Realtime and fires local
 * notifications when significant events occur:
 * - Tournament starts (status: draft → running)
 * - Round advances (current_round changes)
 * - Tournament completes (status: running → completed)
 *
 * Push token registration is handled separately via
 * `requestNotificationPermissionOnJoin()` in notification-service.ts,
 * triggered on first tournament join — NOT eagerly on mount.
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { Tournament } from '../lib/types';
import {
  notifyTournamentStarted,
  notifyRoundStarted,
  notifyTournamentCompleted,
} from '../services/notification-service';

type UseTournamentNotificationsOptions = {
  tournament: Tournament | null;
};

/**
 * Fires local notifications based on tournament state transitions.
 * Only notifies when the app is backgrounded (foreground events are
 * already visible on screen).
 */
export function useTournamentNotifications({
  tournament,
}: UseTournamentNotificationsOptions): void {
  // Track previous values to detect state transitions
  const prevStatusRef = useRef<string | null>(null);
  const prevRoundRef = useRef<number | null>(null);

  // Watch for tournament state transitions
  useEffect(() => {
    if (!tournament) return;

    const prevStatus = prevStatusRef.current;
    const prevRound = prevRoundRef.current;

    // Update refs for next comparison
    prevStatusRef.current = tournament.status;
    prevRoundRef.current = tournament.current_round;

    // Skip initial mount — only react to transitions
    if (prevStatus === null) return;

    // Only notify when app is backgrounded
    const appState = AppState.currentState;
    if (appState === 'active') return;

    // Tournament started: draft → running
    if (prevStatus === 'draft' && tournament.status === 'running') {
      notifyTournamentStarted(tournament.name);
      return;
    }

    // Round advanced
    if (
      prevRound !== null &&
      tournament.current_round !== null &&
      tournament.current_round > prevRound &&
      tournament.status === 'running'
    ) {
      notifyRoundStarted(tournament.name, tournament.current_round);
      return;
    }

    // Tournament completed: running → completed
    if (prevStatus === 'running' && tournament.status === 'completed') {
      notifyTournamentCompleted(tournament.name);
    }
  }, [tournament?.status, tournament?.current_round]);
}
