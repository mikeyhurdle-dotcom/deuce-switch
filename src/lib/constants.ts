// Smashd — Brand & App Constants
// Aligned to Locked Brand System — Electric Court palette (28 Feb 2026)
// See src/theme/smashd-theme.ts for full token spec

// ─── Color Palette (Triadic: Yellow / Violet / Aqua) ────────────────────────

export const Colors = {
  // Core Triadic Palette
  opticYellow: '#CCFF00',
  violet: '#7C3AED',
  aquaGreen: '#2DD4BF',

  // Complementary brand colours
  yellowMuted: '#9CB800',    // Pressed/hover state for yellow
  violetLight: '#A855F7',    // Badges, tags, secondary violet
  aquaDark: '#0E9F97',       // Pressed/hover state for aqua
  coral: '#F472B6',          // Special events, social features

  // Dark UI Foundation
  darkBg: '#0F0A1A',         // Deepest background — Night (violet-tinted)
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
  info: '#2DD4BF',            // Aqua for info states

  // Borders
  border: '#334155',          // Default borders
  borderStrong: '#94A3B8',    // Emphasized borders
  borderFocus: '#CCFF00',     // Focus rings

  // Medals (tournament results)
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const Fonts = {
  mono: 'SpaceMono',
  body: 'Outfit',
  heading: 'Outfit',
  bodyMedium: 'Outfit-Medium',
  bodySemiBold: 'Outfit-SemiBold',
  bodyBold: 'Outfit-Bold',
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
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  glowAqua: {
    shadowColor: '#2DD4BF',
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
  tagline: 'The rally never ends.',
  website: 'https://playsmashd.com',
  scheme: 'smashd',
} as const;
