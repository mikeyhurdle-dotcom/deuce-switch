# Changelog

All notable changes to the SMASHD native app are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project loosely follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — Unreleased

### Added
- **Tab bar restructure**: new Home / Discover / [Log Match] / Coach / Stats layout.
  The old centre "Play" tab has been replaced with a raised Log Match button.
- **Log Match bottom sheet**: unified entry point for match logging with Quick Score,
  Import Screenshot, Host Tournament, and Join Tournament actions.
- **Manual match logging form**: date, match type, format, partner/opponent names,
  1–5 sets, venue, and notes. Writes to `match_records` + `match_scores` and
  syncs to `player_match_results` for backwards compatibility with Stats.
- **Tracking tool first-run setup**: users pick which platforms they currently
  use (Padelio, PadelPlay, Padel Point, Padel Pointer, PadelTick, Apple Health,
  Strava, Manual). Stored on `profiles.tracking_tools`. UI-only until backing
  integrations land in subsequent releases.
- **Coach tab**: new training video library with a featured carousel and a
  filterable 2-column grid (shot type, skill level). Launches with 6 curated
  creators featured: The Padel School, the4Set, PADELARTE, SP Padel Academy,
  Otro Nivel Padel, Padel Mobility.
- **Ranking mode toggle**: organisers can switch a tournament between
  `total_points` and `avg_points` ranking. Adds `avgPointsPerRound` metric
  to standings. Leaderboard, results, and TV mode all render both columns
  and highlight the active metric.
- **Onboarding wizard gate**: new users are redirected to `onboarding-wizard`
  on first launch, gated by AsyncStorage flag.
- **Enriched Stats surfaces**: PadelDNACard, HighlightGrid, and
  PerformanceSection components.
- **Home feed polish**: HomeSkeleton shimmer state and contextual
  TournamentCTAs.
- **Avatar editor** in settings.
- **Expanded PostHog analytics** for match import and consent flows.
- **Video detail route** at `app/(app)/video/[id]` for the Coach tab.

### Changed
- **Bye player scoring fix**: previously the bye `avgScore` was added to both
  `pointsFor` and `pointsAgainst`, quietly penalising bye recipients on point
  differential. Now only adds to `pointsFor`. Silent scoring correction.
- **Tournament organiser / leaderboard / results / TV screens**: all updated
  to surface the active ranking mode. TV mode drops the point-differential
  column in favour of cleaner two-column layout.
- **Profile header, profile feed, share card, and loading overlay**: polish
  and animation refinements.
- **play.tsx** is now hidden from the tab bar (`href: null`) but retained as
  a legacy route. Past Games link points at `/history`; tournament create
  carries the selected format as a query param.

### Removed
- **Legacy `(auth)/onboarding.tsx`**: superseded by the new
  `(app)/onboarding-wizard.tsx` route.
- **Point differential column** from TV mode leaderboard.

### Fixed
- (pending Phase 1) Cold-start data race on app and web: Supabase queries
  now wait for `AuthProvider.loading === false` before firing. Resolves the
  "nothing loads until you close and reopen" bug.
- (pending Phase 1) Optimistic locking on `submitScore` via a new
  `matches.version` column. Two players scoring concurrently no longer
  silently overwrite each other.
- (pending Phase 1) Organiser score submission detects player-submitted
  scores and prompts before overwriting.
- (pending Phase 1) `generateRound` re-fetches matches immediately before
  pairing to avoid stale-state pairings.
- (pending Phase 1) Realtime INSERT events on `matches` are deduplicated by
  `(tournament_id, round_number, player1_id, player2_id)` tuple, not just id.
- (pending Phase 1) `startTournament` is now idempotent via a Postgres RPC
  with row locking. Double-tap no longer creates duplicate rounds.
- (pending Phase 1) PLA-456 — mid-tournament player drop now soft-drops via
  `tournament_status = 'dropped'` instead of hard-deleting `tournament_players`,
  preserving match history.

### Security
- `.gitignore` now excludes `credentials.json`, `screenshots/`,
  `.maestro-pending/`, and `supabase/.temp/` so they cannot leak via
  `git add -A`.
