# Native App Work Queue
Maintained by SmashdBot. Claude Code should pull this file after completing each task.

## HOW TO USE
1. After finishing any task, run: `git -C ~/StormlightArchive pull origin master`
2. Check this file for the next unchecked item
3. Pick it up immediately — no need to wait for Mikey
4. Add a Linear comment when starting and finishing each item
5. Email smashdbot@gmail.com when the session ends

---

## QUEUE

### [x] Deploy edge function + migration — DONE (2026-03-06)
- Deploy: `npx supabase functions deploy push-round-advanced --project-ref wcbpkwxrubditgzdrqof`
- Set secret: `npx supabase secrets set EXPO_ACCESS_TOKEN=<token> --project-ref wcbpkwxrubditgzdrqof` (get token from expo.dev → account → access tokens)
- If Supabase CLI auth needed, flag as blocker for Mikey

### [ ] Set EXPO_ACCESS_TOKEN in Supabase
- Get token from expo.dev → Account Settings → Access Tokens
- Run: `npx supabase secrets set EXPO_ACCESS_TOKEN=<token> --project-ref wcbpkwxrubditgzdrqof`

### [ ] App Store screenshots — BLOCKED: Xcode not installed (~35GB download needed)
- Install Xcode if not present
- Run: `bash capture-screenshots.sh`
- Save to: StormlightArchive/Projects/Padel Brand/03 - Product/app-store-screenshots/
- Required: 5 screenshots at iPhone 6.7 inch

### [ ] EAS production build — BLOCKED: run `npx eas credentials --platform ios` first to fix provisioning profile
- Run: `npx eas build --platform ios --profile production`
- Do NOT submit — Mikey reviews first
- Note the build ID in Linear

### [ ] Post-tournament share card improvements
- Review PlayerShareCard.tsx — make it look excellent
- Final rank (e.g. 2nd of 8), points, tournament name, date
- Smashd branding: Night bg, Optic Yellow accents
- Test the share sheet on simulator

---

## COMPLETED
- WP1: 4 bugs fixed (PLA-135-138)
- WP2: Loading spinners, post-tournament sync, App Store listing text
- WP3: QR code join flow, connections schema, player profile polish
- WP4: App Store screenshots script, share card, deep link config
- WP5: EAS production config, push notifications (PLA-230), in-app consent (PLA-231)

---

## TESTING PROTOCOL
After completing all queue items, run a self-QA pass on the simulator:

1. Launch the app fresh (clear AsyncStorage to simulate first open)
2. Walk through these critical user journeys:
   - First open → consent screen appears → accept → auth flow
   - Create a tournament → generate QR code → join via QR
   - Run a full Americano (4 players, 2 rounds) → enter scores → view leaderboard
   - Complete tournament → share card appears → share button works
   - View player profile → stats and match history visible
   - Background app during tournament → push notification fires on round advance
   - Tap player profile deep link → opens correct screen in app
3. Note any broken flows, crashes, missing data, visual issues
4. Email smashdbot@gmail.com — subject: [NATIVE] Bug report — [date]
   Include: what you tested, what failed, severity (critical/high/medium/low)

SmashdBot will add confirmed bugs to the top of this queue.
