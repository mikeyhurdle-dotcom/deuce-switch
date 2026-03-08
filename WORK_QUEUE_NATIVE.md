# Native App Work Queue
Maintained by SmashdBot. Claude Code should pull this file after completing each task.

## HOW TO USE
1. After finishing any task, run: `git -C ~/StormlightArchive pull origin master`
2. Check this file for the next unchecked item
3. Pick it up immediately — no need to wait for Mikey
4. Add a Linear comment when starting and finishing each item
5. Email smashdbot@gmail.com when the session ends

---

## 🔴 BLOCKER — DESIGN REVIEW REQUIRED BEFORE CODING

**Do not start UI tasks until Mikey approves the mockups.**
Mockups are at: /root/projects/app-mockups/ (index.html for full overview)
Approved designs will be committed to this repo before coding starts.

---

## QUEUE (Priority Order)

### [ ] PRIORITY 1 — Fix remaining schema / runtime bugs
Once Mikey does `git pull` on his Mac and restarts Expo Go:
- [ ] Test Create Tournament end-to-end — should work now with DB fixes
- [ ] Test Join Tournament with a 6-char code
- [ ] Test profile creation on first sign-up (indoor_courts/outdoor_courts now in DB)
- [ ] Report any remaining errors to SmashdBot via Telegram

### [ ] PRIORITY 2 — Fix broken icons (? placeholders)
The app shows ? for all icons. Likely cause: vector icon font not bundled.
- Check what icon library is used (search for Icon imports)
- If using @expo/vector-icons: ensure it's in package.json dependencies (not devDependencies)
- If using Phosphor/Lucide: check the font is loaded in _layout.tsx
- Run on simulator and confirm icons render correctly

### [ ] PRIORITY 3 — Fix tagline
In: app/(app)/auth/login.tsx (or wherever "The rally never ends." appears)
Change: "The rally never ends." → "Every Play Counts."
Search: grep -r "rally never ends" .

### [ ] PRIORITY 4 — Visual overhaul (AFTER mockup approval)
**Wait for Mikey to approve /root/projects/app-mockups/ designs first**

Home screen:
- Dynamic header: "Good evening, [name]" with stats strip
- CREATE TOURNAMENT card: court silhouette background, more energy
- JOIN TOURNAMENT: inline code entry
- Recent tournaments strip
- Stats: matches this month, win rate

Tournament lobby:
- Large QR code centred
- Big join code with copy button
- Player grid filling in as players join
- Player count progress bar

Scoring screen:
- Round indicator (dots)
- Aqua countdown timer
- +/- score buttons bigger, more tactile
- Court cards cleaner

Results / leaderboard:
- Podium layout (2nd left, 1st centre raised, 3rd right)
- Colour-coded positions (gold/silver/bronze)
- Share card auto-generated

Profile:
- Avatar with optic yellow border
- Stats grid: Played / Won / Win% / Points
- Favourite format badge
- Tournament history cards with colour-coded left borders

### [ ] PRIORITY 5 — Deploy push notification edge function
- Needs EXPO_ACCESS_TOKEN from Mikey (expo.dev → account → access tokens)
- Once token received: `npx supabase functions deploy push-round-advanced --project-ref wcbpkwxrubditgzdrqof`
- Set secret: `npx supabase secrets set EXPO_ACCESS_TOKEN=<token> --project-ref wcbpkwxrubditgzdrqof`

### [ ] PRIORITY 6 — App Store screenshots
- Run: `bash capture-screenshots.sh` (after visual overhaul is done)
- Or manually: Cmd+S on each key screen in iPhone 17 Pro simulator
- Required screens: home, create tournament, lobby, scoring, results
- Save to: StormlightArchive/Projects/Padel Brand/03 - Product/app-store-screenshots/

### [ ] PRIORITY 7 — Share card polish
- Review PlayerShareCard.tsx
- Final rank (e.g. "2nd of 8"), points, tournament name, date
- Night background, Optic Yellow accents
- Test share sheet on simulator

---

## COMPLETED
- WP1: 4 bugs fixed (PLA-135-138)
- WP2: Loading spinners, post-tournament sync, App Store listing text
- WP3: QR code join flow, connections schema, player profile polish
- WP4: App Store screenshots script, share card, deep link config
- WP5: EAS production config, push notifications (PLA-230), in-app consent (PLA-231)
- WP6 (8 Mar 2026): DB schema audit + fixes:
  - tournaments: added format, join_code, organiser_id + trigger + RLS fix
  - profiles: added indoor_courts, outdoor_courts
  - tournament_players: fixed profile_id → player_id in create.tsx + home.tsx
  - All fixes pushed to GitHub (main branch)
- WP7 (8 Mar 2026): App Store build submitted:
  - Build 1.0.0 (build 4), EAS Build ID: 4b962d1b, submitted 19:25 UTC
  - Distribution cert + provisioning profile active until Mar 2027
  - APNs push notification key configured

---

## TESTING PROTOCOL
After completing all queue items, run a self-QA pass on the simulator:

1. Launch the app fresh (clear AsyncStorage to simulate first open)
2. Walk through these critical user journeys:
   - First open → consent screen → accept → auth flow → profile created
   - Create tournament → QR code shown in lobby → join via code → start tournament
   - Run full Americano (4 players, 2 rounds) → enter scores → view leaderboard
   - Complete tournament → share card → share button works
   - View player profile → stats and match history visible
   - Push notification fires on round advance (needs EXPO_ACCESS_TOKEN)
3. Note any broken flows, crashes, missing data, visual issues
4. Email smashdbot@gmail.com — subject: [NATIVE] Bug report — [date]
   Include: what you tested, what failed, severity (critical/high/medium/low)

SmashdBot will add confirmed bugs to the top of this queue.
