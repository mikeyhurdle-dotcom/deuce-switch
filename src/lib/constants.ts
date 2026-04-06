// Smashd — Brand & App Constants
// Aligned to Locked Brand System — Electric Court palette (28 Feb 2026)
// See src/theme/smashd-theme.ts for full token spec

// ─── Color Palette (Triadic: Yellow / Violet / Aqua) ────────────────────────

export const Colors = {
  // Core Triadic Palette
  opticYellow: '#CCFF00',
  violet: '#7B2FBE',
  aquaGreen: '#00CFC1',

  // Complementary brand colours
  yellowMuted: '#9CB800',    // Pressed/hover state for yellow
  violetLight: '#A855F7',    // Badges, tags, secondary violet
  aquaDark: '#0E9F97',       // Pressed/hover state for aqua
  coral: '#F472B6',          // Special events, social features

  // Dark UI Foundation
  darkBg: '#0A0F1C',         // Deepest background — Night (aligned to smashd-theme)
  card: '#111827',            // Primary surface — cards, content areas
  cardHover: '#334155',       // Hovered cards/rows
  surface: '#1E293B',         // Elevated surfaces — inputs, modals
  surfaceLight: '#334155',    // Skeleton loaders, subtle separators

  // Text
  textPrimary: '#F8FAFC',    // High-emphasis — headings
  text: '#F8FAFC',            // Alias for textPrimary
  textSecondary: '#E2E8F0',  // Body text, descriptions
  textDim: '#94A3B8',         // Labels, captions, placeholders
  textMuted: '#64748B',       // Disabled, tertiary text

  // Functional / Status
  success: '#22C55E',         // Distinct green (not aqua)
  error: '#EF4444',
  warning: '#FB923C',
  info: '#00CFC1',            // Aqua for info states

  // Borders
  border: '#334155',          // Default borders
  borderStrong: '#94A3B8',    // Emphasized borders
  borderFocus: '#CCFF00',     // Focus rings

  // Medals (tournament results)
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

// ─── Alpha Layers (brand colors at standard opacity levels) ─────────────────
// Use these instead of inline rgba() strings for consistency.

export const Alpha = {
  // Yellow (opticYellow #CCFF00)
  yellow04: 'rgba(204,255,0,0.04)',
  yellow05: 'rgba(204,255,0,0.05)',
  yellow06: 'rgba(204,255,0,0.06)',
  yellow08: 'rgba(204,255,0,0.08)',
  yellow10: 'rgba(204,255,0,0.1)',
  yellow12: 'rgba(204,255,0,0.12)',
  yellow15: 'rgba(204,255,0,0.15)',
  yellow20: 'rgba(204,255,0,0.2)',
  yellow25: 'rgba(204,255,0,0.25)',
  yellow30: 'rgba(204,255,0,0.3)',

  // Aqua (aquaGreen #00CFC1)
  aqua08: 'rgba(0,207,193,0.08)',
  aqua10: 'rgba(0,207,193,0.1)',
  aqua12: 'rgba(0,207,193,0.12)',
  aqua20: 'rgba(0,207,193,0.2)',
  aqua25: 'rgba(0,207,193,0.25)',

  // Violet (#7B2FBE)
  violet08: 'rgba(123,47,190,0.08)',
  violet10: 'rgba(123,47,190,0.1)',
  violet12: 'rgba(123,47,190,0.12)',
  violet15: 'rgba(123,47,190,0.15)',
  violet20: 'rgba(123,47,190,0.2)',
  violet25: 'rgba(123,47,190,0.25)',

  // White (overlays on dark backgrounds)
  white05: 'rgba(255,255,255,0.05)',
  white06: 'rgba(255,255,255,0.06)',
  white08: 'rgba(255,255,255,0.08)',

  // Black (overlays on light backgrounds)
  black05: 'rgba(0,0,0,0.05)',
  black08: 'rgba(0,0,0,0.08)',
  black40: 'rgba(0,0,0,0.4)',
  black50: 'rgba(0,0,0,0.5)',
  black60: 'rgba(0,0,0,0.6)',
  black75: 'rgba(0,0,0,0.75)',

  // Success (#22C55E)
  success10: 'rgba(34,197,94,0.1)',
  success12: 'rgba(34,197,94,0.12)',
  success25: 'rgba(34,197,94,0.25)',

  // Error (#EF4444)
  error08: 'rgba(239,68,68,0.08)',
  error10: 'rgba(239,68,68,0.1)',
  error12: 'rgba(239,68,68,0.12)',
  error25: 'rgba(239,68,68,0.25)',

  // Warning (#FB923C)
  warning10: 'rgba(251,146,60,0.1)',
  warning12: 'rgba(251,146,60,0.12)',
  warning25: 'rgba(251,146,60,0.25)',

  // Gold (#FFD700)
  gold06: 'rgba(255,215,0,0.06)',
  gold10: 'rgba(255,215,0,0.1)',
  gold12: 'rgba(255,215,0,0.12)',
  gold20: 'rgba(255,215,0,0.2)',

  // Purple / Electric Violet (#7C3AED)
  purple07: 'rgba(124,58,237,0.07)',
  purple08: 'rgba(124,58,237,0.08)',
  purple15: 'rgba(124,58,237,0.15)',
  purple20: 'rgba(124,58,237,0.2)',
  purple25: 'rgba(124,58,237,0.25)',
  purple30: 'rgba(124,58,237,0.3)',

  // Slate (#94A3B8 / #334155)
  slate08: 'rgba(148,163,184,0.08)',
  slate30: 'rgba(51,65,85,0.3)',
  slate50: 'rgba(51,65,85,0.5)',

  // Pink (#F472B6)
  pink10: 'rgba(244,114,182,0.1)',

  // Silver (#C0C0C0)
  silver10: 'rgba(192,192,192,0.1)',

  // Bronze (#CD7F32)
  bronze10: 'rgba(205,127,50,0.1)',

  // Amber (#F59E0B)
  amber10: 'rgba(245,158,11,0.1)',

  // Blue (#3B82F6)
  blue10: 'rgba(59,130,246,0.1)',

  // Purple lighter (#A855F7)
  purpleLight10: 'rgba(168,85,247,0.1)',
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const Fonts = {
  mono: 'SpaceMono',
  body: 'Exo2_400Regular',
  heading: 'Exo2_700Bold',
  bodyMedium: 'Exo2_500Medium',
  bodySemiBold: 'Exo2_600SemiBold',
  bodyBold: 'Exo2_700Bold',
  display: 'PermanentMarker', // Electric Court wordmark — logo, rank numbers, display CTAs
} as const;

// ─── Spacing (4px base unit) ────────────────────────────────────────────────

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────

export const Radius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

// ─── Shadows (iOS + Android elevation) ────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  glowYellow: {
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  glowViolet: {
    shadowColor: '#7B2FBE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  glowAqua: {
    shadowColor: '#00CFC1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// ─── Animation Durations ──────────────────────────────────────────────────────

export const Duration = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  glacial: 800,
} as const;

// ─── Animation Stagger ────────────────────────────────────────────────────────

export const Stagger = {
  fast: 50,
  normal: 100,
  slow: 150,
} as const;

// ─── Tournament Defaults ─────────────────────────────────────────────────────

export const TournamentDefaults = {
  pointsPerMatch: 24,
  timePerRoundSeconds: 900, // 15 minutes
  maxPlayers: 16,
  minPlayers: 4,
  defaultFormat: 'americano' as const,
  joinCodeLength: 6,
} as const;

// ─── Supabase Config ─────────────────────────────────────────────────────────

export const SupabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://wcbpkwxrubditgzdrqof.supabase.co',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
} as const;

// ─── App Config ──────────────────────────────────────────────────────────────

export const AppConfig = {
  name: 'Smashd',
  tagline: 'Every point counts.',
  website: 'https://playsmashd.com',
  scheme: 'smashd',
} as const;

// ─── Share Card Variant Colours ───────────────────────────────────────────────
// Custom backgrounds for the PlayerShareCard 4-variant system.
// These are intentionally distinct from the main palette — they're
// rich, oversaturated backgrounds designed to look great as social-share images.

export const ShareCardColors = {
  // Dark variant backgrounds
  darkBg: '#130E24',       // Deep purple-black — default share card
  neonBg: '#141E00',       // Dark night-green — neon variant
  violetBg: '#1F0D3A',     // Rich deep violet — violet variant
  lightBg: '#EEEAF5',      // Soft lavender — light variant

  // Light variant text (dark text on light background)
  lightText: '#1A1A2E',    // Near-black text for light cards
  lightMuted: '#8888AA',   // Muted purple-grey for secondary text
  lightAvatar: '#D8D0E8',  // Light purple for avatar background
  lightCard: '#DDD8E8',    // Light card surface background
} as const;
