# v1.2.0 — Tab restructure, Coach tab, ranking mode, race-condition hardening

## Summary

v1.2.0 is a substantial release bundling (1) the tab bar restructure that turns the old centre Play button into a Log Match sheet, (2) the new Coach tab with curated training videos, (3) an organiser ranking mode toggle (total points vs average points per round), (4) a cross-surface fix for the cold-start data race users were reporting, and (5) a set of race-condition and UX hardening fixes that landed during the pre-ship sprint.

See `CHANGELOG.md` for the full list.

## Highlights

### 🆕 New features
- **Tab bar restructure** — Home / Discover / [Log Match] / Coach / Stats. Old centre Play is replaced by a raised Log Match button opening a bottom sheet.
- **Log Match sheet** — unified entry point: Quick Score (manual logging), Import Screenshot (OCR), Host Tournament, Join Tournament. All four actions visible to every user.
- **Manual match logging form** — full form with date, type, format, partner/opponents, 1–5 sets, venue, notes. Writes to `match_records` + `match_scores`, syncs to `player_match_results`.
- **Coach tab** — training video library with 178 curated videos from 6 launch creators: The Padel School, the4Set, PADELARTE, SP Padel Academy, Otro Nivel Padel, Padel Mobility. See `supabase/migrations/017_coach_featured_curation.sql`.
- **Ranking mode toggle** — organisers can switch a live tournament between total points and average points per round. Full column highlighting in leaderboard, results, and TV mode. Now gated by a confirmation dialog so a tap doesn't silently reorder the leaderboard for every spectator.
- **Onboarding wizard gate** — new users are redirected to `onboarding-wizard` on first launch.
- **Enriched Stats surfaces** — PadelDNACard, HighlightGrid, PerformanceSection.
- **Home feed polish** — skeleton + contextual TournamentCTAs.
- **Avatar editor** in settings.
- **Sentry crash reporting** fully wired via EAS secrets (PLA-426).

### 🔴 Critical fixes
- **PLA-471** — cold-start data race fix. Tabs no longer show empty state on first launch before the auth session rehydrates. AuthProvider callbacks memoised; every tab mount fetch gates on `auth.loading === false`.
- **PLA-477** — ranking mode toggle now requires explicit confirmation. No more accidental live reorders during active play.
- **PLA-475** — realtime INSERT dedupe by match tuple, not just id. Prevents duplicate UI rows on local-insert + realtime-echo races.
- **PLA-456** — mid-tournament player drop now soft-drops (`tournament_status = 'dropped'`) instead of hard-deleting `tournament_players`. Preserves match history.
- **PLA-481** — Coach curation. Was going to ship with the full unvetted 485-video library; now defaults to 178 featured videos from 6 launch creators.
- **PLA-478** — LogMatchProvider error boundary. A render crash inside the sheet no longer silently bounces to Home.
- **PLA-479** — tracking tool setup is now opt-in with "Coming Soon" badges. Previously a mandatory gate into a non-functional picker.
- **PLA-480** — Import Screenshot (OCR) decoupled from hasTools. Fresh users can now reach the frictionless OCR path without navigating through a preference picker first.
- **PLA-482** — Coach analytics events (`coach_video_opened` with player profile properties, `coach_filter_applied`). Groundwork for the 5-coach partnership data-sharing reporting.
- **Bye player scoring** — previously the bye `avgScore` was double-counted in `pointsAgainst`. Silent correction.

### 🗄️ Migrations applied to production
- `017_coach_featured_curation.sql` — one-time data migration, ~178 videos flagged featured, rest unfeatured. Already applied via Supabase MCP on 2026-04-08.
- (Ranking mode column `tournaments.ranking_mode` was already applied via the web repo's `018_tournament_ranking_mode.sql` — captured in the smashd-web PR.)

## Test plan

Before merge, run the 30-minute smoke test in `docs/SMOKE_TEST_v1.2.0.md` (if present) or the critical path:

- [ ] Cold-start the app after a force-quit — Home tab shows data on first render (PLA-471)
- [ ] Tab through Home → Discover → Coach → Stats — every tab loads data, no empty states
- [ ] Coach tab shows only videos from the 6 launch creators (PLA-481)
- [ ] Log Match centre button opens sheet → Quick Actions visible immediately (PLA-479)
- [ ] Import Screenshot card visible without tracking tools configured (PLA-480)
- [ ] Tapping "Connect tracking tools" opens setup with "Coming Soon" badges and a visible "Skip for now" button (PLA-479)
- [ ] Creating + starting a tournament, then toggling ranking mode, surfaces a confirmation dialog (PLA-477)
- [ ] Two players scoring the same match — second attempt sees the existing "already submitted" error (existing Postgres CAS, verified by PLA-472 investigation)

Maestro flows:

- [ ] `.maestro/42_qr_deeplink_join.yaml` — deep link join flow
- [ ] `.maestro/43_ranking_mode_dialog.yaml` — ranking mode confirmation
- [ ] `.maestro/44_log_match_quick_actions.yaml` — Log Match sheet content coverage

Use release builds per `feedback_maestro_testing.md` — dev client overlay intercepts taps.

## What's NOT in this release (deliberately)

- **PLA-476** — idempotent `startTournament` RPC. Parked to v1.2.1. Existing client-side `busy` flag mitigates double-tap in practice; Sentry will surface evidence if the race manifests in prod.
- **PLA-472** — closed after investigation. Native `submitScore` already has Postgres-level optimistic locking via status CAS. No code change needed.
- **Cross-surface bye-scoring parity** — the native bye fix landed in this release; the web engine did not get the same change. Tracked for a follow-up reconciliation.
- **Running-state player drop UI on native organiser screen** — service-layer fix landed but no UI exposes the action mid-tournament. Lobby drop still works.
- **Android Maestro critical-path fixes (PLA-484)** — deferred to a targeted Android pass after the iOS smoke passes.

## Linear tickets closed by this PR

Native-facing: PLA-471, PLA-475, PLA-456, PLA-477, PLA-478, PLA-479, PLA-480, PLA-481, PLA-482, PLA-426, PLA-472 (closed after investigation).

## Related

- Web-side PR: `smashd-web#release/v1.2.0` (ranking mode, PLA-471 web, PLA-473, PLA-474, PLA-477 web spectator toast).
- Release ticket: PLA-356
- Campaign context: `project_coach_launch_campaign.md` memory (Coach curation), marketing campaign is driving traffic to the Americano flow

🤖 Generated with [Claude Code](https://claude.com/claude-code)
