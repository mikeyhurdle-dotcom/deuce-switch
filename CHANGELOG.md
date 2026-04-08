# Changelog

All notable changes to the SMASHD native app are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project loosely follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — Unreleased

### Added
- **Tab bar restructure**: new Home / Discover / [Log Match] / Coach / Stats
  layout. The old centre "Play" tab has been replaced with a raised Log Match
  button that opens a bottom sheet.
- **Log Match bottom sheet**: unified entry point for match logging. Quick
  Score, Import Screenshot, Host Tournament, and Join Tournament actions are
  always visible — previously Import Screenshot was gated on having tracking
  tools configured, which hid the OCR path from fresh users (fixed, PLA-480).
- **Manual match logging form**: date, match type, format, partner/opponent
  names, 1–5 sets, venue, and notes. Writes to `match_records` + `match_scores`
  and syncs to `player_match_results` for backwards compatibility with Stats.
- **Tracking tool preference setup** (opt-in): users can record which
  platforms they currently use (Padelio, PadelPlay, Padel Point, Padel
  Pointer, PadelTick, Apple Health, Strava, Manual). Every integration
  except Manual is badged as "Coming Soon" (PLA-479). Setup is no longer
  mandatory — users land in Quick Actions immediately and can opt in via a
  "Connect tracking tools" link. Stored on `profiles.tracking_tools` as a
  preference signal for future rollouts.
- **Coach tab**: new training video library with a featured carousel and a
  filterable 2-column grid (shot type, skill level). Launches with 6
  curated creators featured (178 videos total): The Padel School, the4Set,
  PADELARTE, SP Padel Academy, Otro Nivel Padel, Padel Mobility. Deferred
  to v1.2.1: Everything Padel, Hello Padel Academy, Padel Academy 305
  (not yet ingested by ScoutBot). See migration
  `017_coach_featured_curation.sql` and `project_coach_launch_campaign.md`.
- **Video detail route** at `app/(app)/video/[id]` with a YouTube embed.
- **Ranking mode toggle**: organisers can switch a tournament between
  `total_points` and `avg_points` ranking live. Adds `avgPointsPerRound`
  metric to standings. Leaderboard, results, and TV mode all render both
  columns and highlight the active metric. Toggle now requires an explicit
  confirmation dialog (PLA-477) — previously a tap silently reordered every
  spectator's leaderboard.
- **Onboarding wizard gate**: new users are redirected to `onboarding-wizard`
  on first launch, gated by AsyncStorage flag.
- **Enriched Stats surfaces**: PadelDNACard, HighlightGrid, and
  PerformanceSection components.
- **Home feed polish**: HomeSkeleton shimmer state and contextual
  TournamentCTAs.
- **Avatar editor** in settings.
- **LogMatchProvider error boundary** (PLA-478): wraps the Log Match sheet
  in the shared `<ErrorBoundary>` with Sentry capture. A render crash inside
  the sheet now shows a retry UI instead of silently redirecting to Home.
- **Expanded PostHog analytics**: match import, consent flows, and new
  Coach events (`coach_video_opened` with full player profile properties,
  `coach_filter_applied`) to support the future creator partnership
  reporting (PLA-482).
- **Sentry crash reporting** now wired end-to-end: code was already
  installed, this release adds the DSN via EAS secrets + org + project
  setup on the `playsmashd` Sentry org (PLA-426).

### Changed
- **Bye player scoring fix**: previously the bye `avgScore` was added to
  both `pointsFor` and `pointsAgainst`, quietly penalising bye recipients
  on point differential. Now only adds to `pointsFor`. Silent scoring
  correction — bye recipients see a small improvement in their historical
  point differential.
- **Tournament organiser / leaderboard / results / TV screens**: all
  updated to surface the active ranking mode. TV mode drops the
  point-differential column in favour of a cleaner two-column layout.
- **Profile header, profile feed, share card, and loading overlay**: polish
  and animation refinements.
- **play.tsx** is now hidden from the tab bar (`href: null`) but retained
  as a legacy route. Past Games link points at `/history`; tournament
  create carries the selected format as a query param.
- **Tournament player drop** (PLA-456, native): mid-tournament player
  removal now soft-drops via `tournament_status = 'dropped'` instead of
  hard-deleting `tournament_players`. Preserves match history for
  standings and H2H calculations. Draft-state drops still hard-delete.

### Removed
- **Legacy `(auth)/onboarding.tsx`**: superseded by the new
  `(app)/onboarding-wizard.tsx` route.
- **Point differential column** from TV mode leaderboard.

### Fixed
- **Cold-start data race** (PLA-471) — cross-surface fix on both native and
  web. Users were reporting that the app and website showed no data on
  first open until they force-quit and reopened. Root cause: Supabase
  queries were firing before the auth session had rehydrated, hitting RLS
  with no authenticated user and silently returning empty results. Native
  fix: `AuthProvider` memoises `signOut` and `refreshProfile` so consumer
  effects stop thrashing on every re-render; every tab screen (home,
  history, profile, stats, coach, discover) now gates mount fetches on
  `auth.loading === false`. Web fix: new `sessionReady` flag in
  `AuthContext` — the cached user from `getCachedUser()` can flip to
  non-null before the Supabase client's internal session is settled;
  consumer screens (`EditProfileScreen`, `StatsScreen`,
  `LiveTournamentBanner`) gate RLS-scoped fetches on `sessionReady`
  instead of just `user`. Plus memoised callbacks on the context.
- **Realtime INSERT dedupe** (PLA-475, native) — `src/hooks/useTournament.ts`
  now dedupes incoming match inserts by the tuple
  `(tournament_id, round_number, player1_id, player2_id)` as well as by
  id. Previously an id-only check could let a local insert + realtime
  echo both pass and create a duplicate UI row.
- **Stale pairing in `nextRound`** (PLA-474, web) — re-fetches matches
  immediately before calling `generateRound()`. Previously paired from
  cached hook state that could be stale if another client mutated
  matches between load and round advance.
- **Organiser score conflict detection** (PLA-473, web) — the batch
  `submitScores` used to write without checking current match status,
  silently overwriting any player-submitted scores that arrived after
  the organiser opened the form. Now does a pre-check and throws
  `ScoreConflictError` on conflict; the UI catches and prompts the
  organiser for an explicit override via `overrideScores`.
- **Coach tab curation** (PLA-481) — Coach tab was previously going to
  ship with the full 485-video library (only 9 randomly-featured).
  Migration `017_coach_featured_curation.sql` reduces the featured set
  to the 6 launch partner creators only. `fetchVideos()` now defaults to
  `featured = true`.

### Security
- `.gitignore` now excludes `credentials.json`, `screenshots/`,
  `.maestro-pending/`, and `supabase/.temp/` so they cannot leak via
  `git add -A`.

### Parked for v1.2.1
- **PLA-476** — idempotent `startTournament` as a Postgres RPC. The
  existing client-side `busy` flag mitigates double-tap in practice; the
  RPC migration was drafted but parked as defensive infrastructure for a
  rare race. Sentry will surface evidence if it manifests in prod.
- **PLA-472** — closed after investigation. Native `submitScore` already
  has database-level optimistic locking via status CAS
  (`.in('status', ['pending', 'in_progress'])`). The race in the original
  ticket cannot actually happen on native; the web side is covered by
  PLA-473.
- **Cross-surface bye-scoring parity** — the native bye fix landed in
  this release; the web engine did not get the same change. Worth
  reconciling in a follow-up ticket.
- **Running-state player drop UI on native organiser screen** — the
  service-layer fix (PLA-456) landed but no UI exposes the action
  mid-tournament. Lobby-state drop button still works as before.

## [1.1.0]

- Polish sprint v1.1.0 — 11 fixes from design audit v3→v4 (7.4→7.8/10)
- Maestro test cross-platform compatibility
- Design audit polish sprint — 16 issues resolved (PLA-361 → PLA-378)
- Removed XP/level section from profile until framework exists
- iOS TestFlight + Android Alpha submitted

*(These commits live on local `main` and were never pushed to GitHub
before the v1.2.0 work. Capturing here for history.)*
