// src/theme/smashd-theme.ts
// Smashd Design Token Specification v2.0 — Triadic Palette
// Single source of truth for all visual constants.
// Generated: March 2026

export const smashdTheme = {
  colors: {
    brand: {
      // Core Triadic Palette
      yellow: '#CCFF00',       // Primary accent — optic yellow (tennis ball)
      violet: '#7B2FBE',       // Secondary accent — complementary opposite
      aqua: '#00CFC1',         // Tertiary accent — triadic bridge

      // Dark UI Foundation
      dark: '#0A0F1C',         // Deepest background
      navy: '#111827',         // Primary background
      slate: '#1E293B',        // Elevated surfaces
      mid: '#334155',          // Borders, dividers
      muted: '#94A3B8',        // Secondary text
      light: '#E2E8F0',        // Primary text
      white: '#F8FAFC',        // High-emphasis text

      // Complementary Colours
      yellowMuted: '#9CB800',  // Muted yellow for hover/pressed states
      violetLight: '#A855F7',  // Lighter violet for badges, tags
      aquaDark: '#0E9F97',     // Darker aqua for hover states
      coral: '#F472B6',        // Special events, social features
      warm: '#FB923C',         // Warnings, ratings
      red: '#EF4444',          // Errors, destructive actions
      success: '#22C55E',      // Success confirmations
    },

    // Semantic Aliases
    bg: {
      primary: '#0A0F1C',
      secondary: '#111827',
      surface: '#1E293B',
      surfaceHover: '#334155',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#E2E8F0',
      muted: '#94A3B8',
      onAccent: '#0A0F1C',
      onViolet: '#F8FAFC',
    },
    interactive: {
      primary: '#CCFF00',
      primaryHover: '#9CB800',
      secondary: '#7B2FBE',
      tertiary: '#00CFC1',
    },
    border: {
      default: '#334155',
      strong: '#94A3B8',
      focus: '#CCFF00',
    },
    status: {
      success: '#22C55E',
      warning: '#FB923C',
      error: '#EF4444',
      info: '#00CFC1',
    },

    // Utility (medals, special)
    medal: {
      gold: '#FFD700',
      silver: '#C0C0C0',
      bronze: '#CD7F32',
    },
  },

  fontFamily: {
    display: 'Outfit',
    body: 'Outfit',
    mono: 'SpaceMono',
    // React Native weight-specific families
    bodyMedium: 'Outfit-Medium',
    bodySemiBold: 'Outfit-SemiBold',
    bodyBold: 'Outfit-Bold',
  },

  fontSize: {
    hero: 56,
    h1: 36,
    h2: 24,
    h3: 20,
    body: 16,
    sm: 14,
    xs: 12,
    stat: 32,
  },

  lineHeight: {
    hero: 1.05,
    h1: 1.1,
    h2: 1.2,
    h3: 1.3,
    body: 1.6,
    sm: 1.5,
    xs: 1.4,
    stat: 1.1,
  },

  letterSpacing: {
    tight: -0.5,    // Large headings
    normal: 0,      // Body text
    wide: 0.8,      // Buttons, labels, all-caps
    widest: 2.4,    // Section labels, badges
  },

  spacing: {
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
  },

  borderRadius: {
    sm: 6,
    md: 12,
    lg: 20,
    xl: 28,
    full: 9999,
  },

  shadow: {
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
  },

  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    glacial: 800,
  },

  stagger: {
    fast: 50,
    normal: 100,
    slow: 150,
  },
} as const;

export type SmashdTheme = typeof smashdTheme;
