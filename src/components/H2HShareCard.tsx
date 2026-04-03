/**
 * H2HShareCard — Shareable head-to-head stats image card.
 *
 * Same approach as PlayerShareCard: rendered inside ViewShot
 * and captured as a PNG for social sharing.
 *
 * "The most important step a man can take is the next one."
 */

import { Image, StyleSheet, Text, View } from 'react-native';
import { Alpha, Colors, Fonts, ShareCardColors, AppConfig } from '../lib/constants';
import Logo from '../../assets/images/smashd-logo.svg';
import type { CardStyle } from './PlayerShareCard';

// ── Types ──────────────────────────────────────────────────────────────────

export type H2HShareCardProps = {
  playerName: string;
  playerAvatar: string | null;
  opponentName: string;
  opponentAvatar: string | null;
  wins: number;
  losses: number;
  matchesPlayed: number;
  pointsFor: number;
  pointsAgainst: number;
  cardStyle?: CardStyle;
};

// ── Theme Maps ─────────────────────────────────────────────────────────────

const THEME_BG: Record<CardStyle, string> = {
  dark: ShareCardColors.darkBg,
  neon: ShareCardColors.neonBg,
  violet: ShareCardColors.violetBg,
  light: ShareCardColors.lightBg,
};

const THEME_TEXT: Record<CardStyle, string> = {
  dark: Colors.textPrimary,
  neon: Colors.textPrimary,
  violet: Colors.textPrimary,
  light: ShareCardColors.lightText,
};

const THEME_MUTED: Record<CardStyle, string> = {
  dark: Colors.textDim,
  neon: Colors.textDim,
  violet: Colors.textDim,
  light: ShareCardColors.lightMuted,
};

const THEME_ACCENT: Record<CardStyle, string> = {
  dark: Colors.opticYellow,
  neon: Colors.opticYellow,
  violet: Colors.violetLight,
  light: Colors.violet,
};

const THEME_CARD: Record<CardStyle, string> = {
  dark: Alpha.white06,
  neon: Alpha.yellow06,
  violet: 'rgba(168,85,247,0.08)',
  light: Alpha.black05,
};

const THEME_BORDER: Record<CardStyle, string> = {
  dark: Alpha.white08,
  neon: Alpha.yellow12,
  violet: 'rgba(168,85,247,0.15)',
  light: Alpha.black08,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Component ──────────────────────────────────────────────────────────────

export function H2HShareCard({
  playerName,
  playerAvatar,
  opponentName,
  opponentAvatar,
  wins,
  losses,
  matchesPlayed,
  pointsFor,
  pointsAgainst,
  cardStyle = 'dark',
}: H2HShareCardProps) {
  const bg = THEME_BG[cardStyle];
  const text = THEME_TEXT[cardStyle];
  const muted = THEME_MUTED[cardStyle];
  const accent = THEME_ACCENT[cardStyle];
  const cardBg = THEME_CARD[cardStyle];
  const border = THEME_BORDER[cardStyle];
  const isLight = cardStyle === 'light';

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      {/* ─── Accent Bar ───────────────────────────────────────────── */}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      {/* ─── Brand Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoWrap}>
            <Logo width={28} height={28} />
          </View>
          <Text style={[styles.brandName, { color: accent }]}>
            {AppConfig.name.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.h2hLabel, { color: muted }]}>HEAD TO HEAD</Text>
      </View>

      {/* ─── VS Section ───────────────────────────────────────────── */}
      <View style={styles.vsSection}>
        {/* Player */}
        <View style={styles.vsPlayer}>
          {playerAvatar ? (
            <Image source={{ uri: playerAvatar }} style={[styles.vsAvatar, { borderColor: accent }]} />
          ) : (
            <View
              style={[
                styles.vsAvatarFallback,
                {
                  backgroundColor: isLight ? ShareCardColors.lightAvatar : Alpha.yellow08,
                  borderColor: accent,
                },
              ]}
            >
              <Text style={[styles.vsAvatarText, { color: accent }]}>{getInitials(playerName)}</Text>
            </View>
          )}
          <Text style={[styles.vsName, { color: text }]} numberOfLines={1}>
            {playerName}
          </Text>
        </View>

        {/* VS Badge */}
        <View style={[styles.vsBadge, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.vsText, { color: accent }]}>VS</Text>
        </View>

        {/* Opponent */}
        <View style={styles.vsPlayer}>
          {opponentAvatar ? (
            <Image source={{ uri: opponentAvatar }} style={[styles.vsAvatar, { borderColor: border }]} />
          ) : (
            <View
              style={[
                styles.vsAvatarFallback,
                {
                  backgroundColor: isLight ? ShareCardColors.lightAvatar : Alpha.white06,
                  borderColor: border,
                },
              ]}
            >
              <Text style={[styles.vsAvatarText, { color: muted }]}>{getInitials(opponentName)}</Text>
            </View>
          )}
          <Text style={[styles.vsName, { color: text }]} numberOfLines={1}>
            {opponentName}
          </Text>
        </View>
      </View>

      {/* ─── Record ───────────────────────────────────────────────── */}
      <View style={styles.recordSection}>
        <Text style={[styles.recordWins, { color: Colors.success }]}>{wins}</Text>
        <Text style={[styles.recordDash, { color: muted }]}> — </Text>
        <Text style={[styles.recordLosses, { color: Colors.coral }]}>{losses}</Text>
      </View>
      <Text style={[styles.matchCount, { color: muted }]}>
        {matchesPlayed} {matchesPlayed === 1 ? 'match' : 'matches'} played together
      </Text>

      {/* ─── Divider ──────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* ─── Points ───────────────────────────────────────────────── */}
      <View style={styles.pointsRow}>
        <View style={[styles.pointsCell, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.pointsValue, { color: accent }]}>{pointsFor}</Text>
          <Text style={[styles.pointsLabel, { color: muted }]}>PTS</Text>
        </View>
        <View style={[styles.pointsCell, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.pointsValue, { color: text }]}>{pointsAgainst}</Text>
          <Text style={[styles.pointsLabel, { color: muted }]}>PTS</Text>
        </View>
      </View>

      {/* ─── Divider ──────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View
          style={[
            styles.ctaPill,
            {
              backgroundColor: isLight ? Alpha.violet08 : Alpha.yellow08,
              borderColor: isLight ? Alpha.violet20 : Alpha.yellow20,
            },
          ]}
        >
          <Text style={[styles.cta, { color: accent }]}>playsmashd.com</Text>
        </View>
        <Text style={[styles.tagline, { color: muted }]}>
          Join me on Smashd — {AppConfig.tagline}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: 390,
    paddingTop: 0,
    paddingBottom: 28,
    paddingHorizontal: 28,
    gap: 16,
    overflow: 'hidden',
  },

  // Accent
  accentBar: {
    height: 3,
    width: '100%',
    marginBottom: 2,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
  },
  brandName: {
    fontFamily: Fonts.mono,
    fontSize: 22,
    letterSpacing: 8,
  },
  h2hLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 3,
  },

  // VS Section
  vsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  vsPlayer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  vsAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  vsAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsAvatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 24,
  },
  vsName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    textAlign: 'center',
  },
  vsBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontFamily: Fonts.display,
    fontSize: 14,
  },

  // Record
  recordSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
  },
  recordWins: {
    fontFamily: Fonts.display,
    fontSize: 56,
  },
  recordDash: {
    fontFamily: Fonts.display,
    fontSize: 32,
    paddingHorizontal: 4,
  },
  recordLosses: {
    fontFamily: Fonts.display,
    fontSize: 56,
  },
  matchCount: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: -8,
  },

  // Divider
  divider: {
    height: 1,
  },

  // Points
  pointsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pointsCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  pointsValue: {
    fontFamily: Fonts.mono,
    fontSize: 22,
  },
  pointsLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  ctaPill: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  cta: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
