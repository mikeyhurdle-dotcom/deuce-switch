# Smashd Native App — Claude Code Guide

> For full project context, invoke the `smashd-native` skill.
> This file is the always-available quick-reference for daily coding tasks.

---

## Stack at a Glance

| Layer | Tech |
|---|---|
| Framework | Expo SDK 55 / React Native 0.83.2 / React 19 |
| Language | TypeScript (strict) |
| Routing | Expo Router (file-based) |
| Backend | Supabase (auth, RLS, Storage, Realtime) |
| Animations | react-native-reanimated 3 |
| Icons | @expo/vector-icons |
| SVG | react-native-svg + react-native-svg-transformer |

---

## Project Layout

```
smashd-app/
├── app/                        # All screens (Expo Router)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── onboarding.tsx      # stub — needs building
│   └── (app)/
│       ├── (tabs)/             # Bottom tab navigator
│       │   ├── home.tsx        # ✅ wired to Supabase
│       │   ├── discover.tsx    # stub
│       │   ├── play.tsx        # stub (Play Hub)
│       │   ├── stats.tsx       # stub
│       │   ├── profile.tsx     # stub
│       │   └── history.tsx     # stub
│       ├── tournament/[id]/    # Tournament screens
│       ├── settings.tsx        # stub
│       └── notifications.tsx   # stub
├── src/
│   ├── components/ui/          # Shared UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Skeleton.tsx
│   │   ├── SmashdLogo.tsx      # SVG logo component
│   │   └── LoadingOverlay.tsx
│   ├── engine/                 # Tournament logic (pure functions)
│   │   ├── americano.ts        # Pairing algorithm
│   │   └── standings.ts        # Standings calculator
│   ├── hooks/                  # React hooks
│   │   ├── useTournament.ts
│   │   ├── useTournamentClock.ts
│   │   └── useNotifications.ts
│   ├── services/               # Supabase data layer
│   │   ├── tournament-service.ts
│   │   ├── feed-service.ts
│   │   ├── share-service.ts
│   │   ├── notification-service.ts
│   │   ├── suggestion-service.ts
│   │   ├── connection-service.ts
│   │   └── offline-queue.ts
│   ├── providers/
│   │   ├── AuthProvider.tsx    # Supabase auth state
│   │   └── ConsentGate.tsx
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   ├── types.ts            # ALL Supabase table types ← single source of truth
│   │   └── constants.ts        # Colors, Fonts, Spacing, Radius, Shadows, Durations
│   └── theme/
│       └── smashd-theme.ts     # Full design token spec (semantic layer)
├── assets/fonts/               # Outfit (4 weights) + SpaceMono
└── metro.config.js             # SVG transformer config
```

---

## Design System — Electric Court

**Always import tokens from `src/lib/constants.ts` for component work.**
Use `src/theme/smashd-theme.ts` for semantic references (bg.primary, text.muted, etc.).

### Brand Palette (Triadic)
```
opticYellow  #CCFF00   ← Primary CTA, focus rings, active states
violet       #7B2FBE   ← Secondary accent, badges
aquaGreen    #00CFC1   ← Tertiary, info states
```

### Dark UI Foundation
```
darkBg       #0A0F1C   ← Deepest background
card         #111827   ← Card surfaces
surface      #1E293B   ← Inputs, modals, elevated surfaces
surfaceLight #334155   ← Borders, dividers, skeleton
```

### Text
```
textPrimary  #F8FAFC   ← High-emphasis headings
textSecondary #E2E8F0  ← Body text
textDim      #94A3B8   ← Labels, captions
textMuted    #64748B   ← Disabled / tertiary
```

### Typography
- **Current fonts (loaded):** `Outfit` (body/heading) + `SpaceMono` (mono)
- **Target fonts (mockups):** `Exo 2` (body) + `Permanent Marker` (CTAs/logo/display)
- Font upgrade is tracked in **PLA-282** (Permanent Marker) + **PLA-283** (Exo 2)
- Until fonts are upgraded, use `Outfit` — do NOT introduce new font families

### Spacing (4px base)
```
Spacing[1]=4  Spacing[2]=8  Spacing[3]=12  Spacing[4]=16
Spacing[5]=20 Spacing[6]=24 Spacing[8]=32  Spacing[10]=40
```

### Border Radius
```
Radius.sm=6  Radius.md=12  Radius.lg=20  Radius.xl=28  Radius.full=9999
```

### Shadows / Glows
Use `Shadows.glowYellow`, `Shadows.glowViolet`, `Shadows.glowAqua` for branded glow effects.

---

## Key Types (from `src/lib/types.ts`)

```typescript
Profile          // User profile — matches_played, smashd_level, preferred_position
Tournament       // id, name, organizer_id, tournament_format, status, current_round
TournamentPlayer // Links player ↔ tournament — tournament_status: active|waitlist|dropped
Match            // player1–4, team_a_score, team_b_score, status: pending|in_progress|reported|approved
ScoreReport      // Submitted scores pending approval
PlayerMatchResult // Historical match results (source: americano|mexicano|playtomic|screenshot|manual)
Club             // Padel club — lat/lng, court_count, is_partner
Team             // Fixed pairs for team_americano/mixicano
Connection       // Friend connections — requester_id, recipient_id, status
FeedPost         // Tournament social feed post
FeedComment      // Comment on a feed post
AmericanoStanding // Computed standings per player
TournamentFormat  // 'americano' | 'mexicano' | 'team_americano' | 'mixicano'
```

---

## Supabase Tables

```
profiles            tournaments         tournament_players
matches             score_reports       player_match_results
clubs               teams               connections
tournament_posts    post_comments       post_reactions
consent_audit_logs
```

Key RPCs: `get_connection_status`, `get_connections`, `get_pending_requests`,
`get_player_suggestions`, `get_tournament_feed`, `get_post_comments`

---

## Coding Conventions

1. **All styles inline** — `StyleSheet.create()` or inline style objects, never CSS modules
2. **Import tokens** — always `import { Colors, Fonts, Spacing, Radius } from '@/src/lib/constants'`
3. **Dark background first** — wrap screens in `backgroundColor: Colors.darkBg` by default
4. **Skeleton loading** — use `<Skeleton>` from `src/components/ui/Skeleton.tsx` while fetching
5. **Error states** — show inline error with `Colors.error` (#EF4444), not alert()
6. **Animations** — use `react-native-reanimated` for all animations (already installed)
7. **SVG icons** — use `@expo/vector-icons` (Ionicons / MaterialCommunityIcons) not emoji
8. **No hardcoded colours** — always reference `Colors.*` or `smashdTheme.colors.*`
9. **TypeScript strict** — no `any`, match types from `src/lib/types.ts` exactly
10. **Stub screens** — many screens exist as empty files; build content into the existing file, don't create new routes

---

## Auth Pattern

```typescript
import { useAuth } from '@/src/providers/AuthProvider';
const { session, user, profile } = useAuth();
// profile is the Profile type from types.ts
// user is the Supabase auth user
```

---

## Testing & Running

```bash
# Start dev server
npx expo start

# Run on iOS Simulator (preferred for testing)
npx expo run:ios

# Run on Android
npx expo run:android

# Type check
npx tsc --noEmit

# Known login issue: tracked in PLA-303 (Urgent)
# If login silently fails, check AuthProvider + Supabase anon key in .env
```

---

## Active Linear Backlog (Sprint Order)

| ID | Task | Priority |
|---|---|---|
| PLA-303 | Login bug — sign-in silently fails | Urgent |
| PLA-282 | Font: Permanent Marker for CTAs/logo | High |
| PLA-283 | Font: Exo 2 as body font | High |
| PLA-284 | Design token audit | Normal |
| PLA-285 | Tab bar upgrade | High |
| PLA-286 | Settings screen | Normal |
| PLA-287 | Notifications screen | Normal |
| PLA-288 | Onboarding flow | High |
| PLA-289 | Home screen UI upgrade | High |
| PLA-290 | Player profile redesign | High |
| PLA-291 | Tournament creation wizard | High |
| PLA-292 | Leaderboard screen | Normal |
| PLA-293 | Discover screen | Normal |
| PLA-294 | Stats dashboard | Normal |
| PLA-295 | Play Hub | High |
| PLA-296 | Import Players (OCR) | High |
| PLA-297 | Review Match screen | Normal |
| PLA-298 | Share card generator | Normal |
| PLA-299 | Event detail screen | Normal |
| PLA-300 | TV Mode | Normal |
| PLA-301 | Animation pass | Normal |
| PLA-302 | Accessibility audit | Normal |

> **Start with PLA-303** (login bug) — blocks all testing.
> **Then PLA-282/283** — fonts affect every screen.

---

## Before You Write Any Code

- [ ] Check `src/lib/types.ts` — use existing types, don't invent new shapes
- [ ] Check `src/services/` — there may already be a service function for what you need
- [ ] Check `src/components/ui/` — use existing Button, Card, Badge, Input before building new components
- [ ] Paste the relevant mockup screenshot in context — work to match it precisely
- [ ] Run `npx tsc --noEmit` after changes to catch type errors

---

## Environment

```bash
# .env (or app.config.ts)
EXPO_PUBLIC_SUPABASE_URL=https://wcbpkwxrubditgzdrqof.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<key>
```

Bundle ID: `com.playsmashd.app`
Apple Team: `JJ273J48DJ`
ASC App ID: `6760191852`
