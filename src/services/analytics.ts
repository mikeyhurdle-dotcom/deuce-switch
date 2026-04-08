/**
 * Analytics — thin wrapper around PostHog for key tournament events.
 *
 * Screen views and lifecycle events are auto-captured by the PostHog provider.
 * This file is for explicit custom events only.
 */

import PostHog from 'posthog-react-native';

let posthogInstance: PostHog | null = null;

/** Called once from PostHogProvider to share the instance */
export function setPostHogInstance(ph: PostHog) {
  posthogInstance = ph;
}

function capture(event: string, properties?: Record<string, string | number | boolean | null>) {
  posthogInstance?.capture(event, properties);
}

// ─── Tournament Lifecycle ────────────────────────────────────────────────────

export function trackTournamentCreated(props: {
  tournamentId: string;
  format: string;
  maxPlayers: number | null;
  pointsPerMatch: number;
}) {
  capture('tournament_created', props);
}

export function trackTournamentStarted(props: {
  tournamentId: string;
  playerCount: number;
}) {
  capture('tournament_started', props);
}

export function trackTournamentCompleted(props: {
  tournamentId: string;
  totalRounds: number;
}) {
  capture('tournament_completed', props);
}

// ─── Match Events ────────────────────────────────────────────────────────────

export function trackScoreSubmitted(props: {
  tournamentId: string;
  matchId: string;
  roundNumber: number;
}) {
  capture('score_submitted', props);
}

export function trackRoundAdvanced(props: {
  tournamentId: string;
  roundNumber: number;
}) {
  capture('round_advanced', props);
}

// ─── Player Events ───────────────────────────────────────────────────────────

export function trackPlayerJoined(props: {
  tournamentId: string;
  method: 'join_code' | 'claim_ghost' | 'guest_link';
}) {
  capture('player_joined', props);
}

export function trackGuestPlayerAdded(props: {
  tournamentId: string;
  method: 'manual' | 'ocr_import';
}) {
  capture('guest_player_added', props);
}

// ─── OCR Import Events ──────────────────────────────────────────────────────

export function trackOcrImportCompleted(props: {
  matchesImported: number;
  batchId: string;
  platformSource: string | null;
}) {
  capture('ocr_import_completed', {
    matches_imported: props.matchesImported,
    batch_id: props.batchId,
    platform_source: props.platformSource,
  });
}
