# Smashd Design Token Specification v2.0

**Triadic Palette Update — March 2026**
**Status**: Active — single source of truth for all visual constants

---

## 1. Purpose & Context

This specification defines the design tokens for the Smashd platform. Design tokens are named values (colours, spacing, typography, animation timing) that replace hardcoded CSS/StyleSheet values scattered across components.

The Smashd MVP is live and deployed. Tournament flows work, auth is operational. This spec normalises the ad-hoc values from rapid MVP development into a structured, maintainable token system.

**v2.0** reflects the locked triadic brand palette: **Optic Yellow**, **Violet**, and **Aqua Green** — three colours spaced at equal 120° intervals on the colour wheel.

### Design Philosophy

Smashd is a **premium player identity platform**, not a booking app. Visual language draws from Whoop, Oura, and Strava — dark-mode-first, data-rich, identity-driven. The triadic palette injects energy and distinctiveness that separates Smashd from every other padel platform.

---

## 2. Colour Tokens

### 2.1 Core Triadic Palette

| Token          | Hex       | Role                                                                       |
| -------------- | --------- | -------------------------------------------------------------------------- |
| `brand.yellow` | `#CCFF00` | Primary accent — CTAs, active states, winner highlights, primary buttons   |
| `brand.violet` | `#7B2FBE` | Secondary accent — rankings, premium features, tournament brackets, links  |
| `brand.aqua`   | `#00CFC1` | Tertiary accent — stats, info states, player profiles, data visualisations |

**Colour theory**: Yellow (~75° HSL), Violet (~270°, complementary opposite), Aqua (~175°, equidistant). Maximum contrast with mathematical balance.

### 2.2 Dark UI Foundation

| Token | Hex | Role |
|-------|-----|------|
| `brand.dark` | `#0A0F1C` | Deepest background — app shell |
| `brand.navy` | `#111827` | Primary background — page surfaces |
| `brand.slate` | `#1E293B` | Elevated surfaces — cards, modals |
| `brand.mid` | `#334155` | Borders, dividers |
| `brand.muted` | `#94A3B8` | Secondary text, labels, placeholders |
| `brand.light` | `#E2E8F0` | Primary text on dark backgrounds |
| `brand.white` | `#F8FAFC` | High-emphasis text, headings |

### 2.3 Complementary & Utility Colours

| Token | Hex | Role |
|-------|-----|------|
| `brand.yellowMuted` | `#9CB800` | Muted yellow for hover states |
| `brand.violetLight` | `#A855F7` | Lighter violet for badges, tags |
| `brand.aquaDark` | `#0E9F97` | Darker aqua for hover states |
| `brand.coral` | `#F472B6` | Special events, social features |
| `brand.warm` | `#FB923C` | Warnings, ratings |
| `brand.red` | `#EF4444` | Errors, destructive actions |
| `brand.success` | `#22C55E` | Success confirmations |

### 2.4 Semantic Aliases

| Token | Maps To | Usage |
|-------|---------|-------|
| `bg.primary` | `brand.dark` | App shell, deepest layer |
| `bg.secondary` | `brand.navy` | Page backgrounds |
| `bg.surface` | `brand.slate` | Cards, modals, elevated |
| `bg.surfaceHover` | `brand.mid` | Hovered cards/rows |
| `text.primary` | `brand.white` | Headings, high-emphasis |
| `text.secondary` | `brand.light` | Body text, descriptions |
| `text.muted` | `brand.muted` | Labels, captions |
| `text.onAccent` | `brand.dark` | Text on yellow/aqua backgrounds |
| `text.onViolet` | `brand.white` | Text on violet backgrounds |
| `interactive.primary` | `brand.yellow` | Primary CTAs |
| `interactive.primaryHover` | `brand.yellowMuted` | Hovered primary CTAs |
| `interactive.secondary` | `brand.violet` | Secondary actions, links |
| `interactive.tertiary` | `brand.aqua` | Tertiary actions, info |
| `border.default` | `brand.mid` | Standard borders |
| `border.strong` | `brand.muted` | Emphasized borders |
| `border.focus` | `brand.yellow` | Focus rings |
| `status.success` | `brand.success` | Success states |
| `status.warning` | `brand.warm` | Warning states |
| `status.error` | `brand.red` | Error states |
| `status.info` | `brand.aqua` | Info states |

---

## 3. Typography Tokens

Two-font system: **Outfit** for geometric modernity, **Space Mono** for data/stats.

### 3.1 Font Stack

| Token | Font | Weights | Usage |
|-------|------|---------|-------|
| `font.display` | Outfit | 700, 800, 900 | Headlines, navigation, buttons |
| `font.body` | Outfit | 400, 500, 600 | Body text, labels, inputs |
| `font.mono` | Space Mono | 400, 700 | Scores, stats, timestamps |

### 3.2 Type Scale (1.25 major third)

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text.hero` | 3.5rem | 1.05 | 900 | Hero sections |
| `text.h1` | 2.25rem | 1.1 | 800 | Page titles |
| `text.h2` | 1.5rem | 1.2 | 700 | Section headings |
| `text.h3` | 1.25rem | 1.3 | 700 | Subsections, card titles |
| `text.body` | 1rem | 1.6 | 400 | Body text |
| `text.sm` | 0.875rem | 1.5 | 500 | Labels, secondary info |
| `text.xs` | 0.75rem | 1.4 | 600 | Captions, badges |
| `text.stat` | 2rem | 1.1 | 800 (mono) | Scores, rankings |

### 3.3 Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `tracking.tight` | -0.02em | Large headings |
| `tracking.normal` | 0 | Body text |
| `tracking.wide` | 0.05em | Buttons, labels, all-caps |
| `tracking.widest` | 0.15em | Section labels, badges |

---

## 4. Spacing Tokens (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `space.0` | 0px | Reset |
| `space.1` | 4px | Inline gaps, icon-to-text |
| `space.2` | 8px | Compact padding, badges |
| `space.3` | 12px | Input padding, small cards |
| `space.4` | 16px | Standard padding, list items |
| `space.5` | 20px | Between sections within card |
| `space.6` | 24px | Card padding, form fields |
| `space.8` | 32px | Between cards, section padding |
| `space.10` | 40px | Mobile page horizontal padding |
| `space.12` | 48px | Desktop page horizontal padding |
| `space.16` | 64px | Major section breaks |
| `space.20` | 80px | Page top/bottom padding |
| `space.24` | 96px | Hero section padding |

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.sm` | 6px | Badges, tags |
| `radius.md` | 12px | Cards, inputs, modals (workhorse) |
| `radius.lg` | 20px | Large cards, bottom sheets |
| `radius.xl` | 28px | Feature cards, promotional |
| `radius.full` | 9999px | Buttons, pills, avatars |

---

## 6. Shadows & Effects

### Standard Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow.sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle lift, tags |
| `shadow.md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards, dropdowns |
| `shadow.lg` | `0 8px 24px rgba(0,0,0,0.5)` | Modals, overlays |

### Brand Glow Effects (use sparingly)

| Token | Value | Usage |
|-------|-------|-------|
| `glow.yellow` | `0 0 20px rgba(204,255,0,0.15)` | Primary CTA hover |
| `glow.yellowStrong` | `0 8px 30px rgba(204,255,0,0.25)` | Active primary CTA |
| `glow.violet` | `0 0 20px rgba(123,47,190,0.2)` | Premium features |
| `glow.violetStrong` | `0 8px 30px rgba(123,47,190,0.3)` | Tournament bracket focus |
| `glow.aqua` | `0 0 20px rgba(0,207,193,0.15)` | Stat cards |
| `glow.aquaStrong` | `0 8px 30px rgba(0,207,193,0.25)` | Active data vis |

### Glassmorphism

| Token | Value |
|-------|-------|
| `backdrop.blur` | `blur(20px)` |
| `backdrop.bg` | `rgba(10,15,28,0.85)` |
| `backdrop.border` | `rgba(255,255,255,0.06)` |

---

## 7. Animation Constants

### Durations

| Token | Value | Usage |
|-------|-------|-------|
| `duration.instant` | 100ms | Micro-interactions, toggles |
| `duration.fast` | 200ms | Hover states, focus rings |
| `duration.normal` | 300ms | Show/hide, tab switches |
| `duration.slow` | 500ms | Page transitions, modals |
| `duration.glacial` | 800ms | Hero animations, splash |

### Easing Curves

| Token | Value | Usage |
|-------|-------|-------|
| `ease.default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General-purpose |
| `ease.in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |
| `ease.out` | `cubic-bezier(0, 0, 0.2, 1)` | Entrances |
| `ease.bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful interactions |
| `ease.spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Card hover, button press |

### Stagger Delays

| Token | Value | Usage |
|-------|-------|-------|
| `stagger.fast` | 50ms | Dense lists |
| `stagger.normal` | 100ms | Card grids |
| `stagger.slow` | 150ms | Feature sections |

---

## 8. Core Component Library

Ten components in `src/components/smashd/` — each consumes only design tokens.

| Component | Variants | MVP Status | Priority |
|-----------|----------|------------|----------|
| SmashButton | primary (yellow), secondary (violet), ghost, danger | Partial — standardise | P0 |
| SmashCard | default, elevated, interactive | Various exist — consolidate | P0 |
| SmashInput | text, search, password | Exists — needs focus ring | P0 |
| SmashBadge | status, level, count | Partial — standardise | P1 |
| SmashAvatar | sm, md, lg | New — build | P1 |
| SmashStat | default, highlighted | Exists — extract | P1 |
| SmashTab | default, active | Exists — extract | P1 |
| SmashModal | dialog, bottomSheet | Basic exists — add sheet | P2 |
| SmashToast | success, warning, error, info | New | P2 |
| SmashSectionLabel | default | Used everywhere — standardise | P1 |

**Key**: SmashButton primary = `brand.yellow` + `brand.dark` text. Secondary = `brand.violet` + white text. Aqua reserved for tertiary/info.

---

## 9. Migration Plan

### Phase 1: Foundation (1–2 days)
- Create `src/theme/smashd-theme.ts`
- Update constants/config to wire in new tokens
- Add Google Fonts: Outfit (400–900), Space Mono (400, 700)
- Verify existing pages render identically

### Phase 2: Component Extraction (3–5 days)
1. SmashButton + SmashCard (highest reuse)
2. SmashInput + SmashBadge (tournament flow)
3. SmashStat + SmashSectionLabel (scores + headers)
4. SmashAvatar + SmashTab (profiles + nav)
5. SmashModal + SmashToast (overlays)

### Phase 3: Boy Scout Rule (Ongoing)
Every time a file is touched — swap hardcoded values for tokens. No exceptions.

---

## 10. Token File Reference

Full token file: `src/theme/smashd-theme.ts` — see [[01 - Token File Source]] or the codebase directly.
