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

// ─── Coach Tab Events ───────────────────────────────────────────────────────
// PLA-482: Groundwork for the 5-coach partnership data-sharing offer.
// See project_coach_launch_campaign.md memory for strategy. The
// per-video + per-user profile properties let us later produce per-
// creator reports like "viewers of The Padel School average a Smashd
// level of 6.2 and prefer the backhand side" — data YouTube Analytics
// cannot provide.

export function trackCoachVideoOpened(props: {
  videoId: string;
  channelName: string | null;
  shotType: string | null;
  skillLevel: string | null;
  userSmashdLevel: number | null;
  userPreferredPosition: string | null;
  userMatchesPlayed: number;
}) {
  capture('coach_video_opened', {
    video_id: props.videoId,
    channel_name: props.channelName,
    shot_type: props.shotType,
    skill_level: props.skillLevel,
    user_smashd_level: props.userSmashdLevel,
    user_preferred_position: props.userPreferredPosition,
    user_matches_played: props.userMatchesPlayed,
  });
}

export function trackCoachFilterApplied(props: {
  shotType: string | null;
  skillLevel: string | null;
}) {
  capture('coach_filter_applied', {
    shot_type: props.shotType,
    skill_level: props.skillLevel,
  });
}
