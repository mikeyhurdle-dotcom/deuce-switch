import { StyleSheet, Text, View } from 'react-native';
import { Alpha, Colors, Fonts, ShareCardColors, AppConfig } from '../lib/constants';
import { TOURNAMENT_FORMAT_LABELS } from '../lib/types';
import type { TournamentFormat } from '../lib/types';
import Logo from '../../assets/images/smashd-logo.svg';

// ── Types ──────────────────────────────────────────────────────────────────

export type CardStyle = 'dark' | 'neon' | 'violet' | 'light';

export type PlayerShareCardBadge = {
  emoji: string;
  label: string;
  variant: 'gold' | 'green' | 'aqua';
};

export type PlayerShareCardProps = {
  playerName: string;
  rank: number;
  totalPlayers: number;
  totalPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
  tournamentName: string;
  tournamentFormat: TournamentFormat;
  tournamentDate: string;
  avatarUrl?: string;
  badges?: PlayerShareCardBadge[];
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

const BADGE_COLORS: Record<
  PlayerShareCardBadge['variant'],
  { bg: string; border: string; text: string }
> = {
  gold: {
    bg: 'rgba(255,215,0,0.12)',
    border: 'rgba(255,215,0,0.25)',
    text: Colors.gold,
  },
  green: {
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.25)',
    text: Colors.success,
  },
  aqua: {
    bg: Alpha.aqua12,
    border: Alpha.aqua25,
    text: Colors.aquaGreen,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function getRankSuffix(rank: number): string {
  if (rank >= 11 && rank <= 13) return 'th';
  switch (rank % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

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
// "Strength does not make one capable of rule; it makes one capable of service."

export function PlayerShareCard({
  playerName,
  rank,
  totalPlayers,
  totalPoints,
  matchesPlayed,
  matchesWon,
  winRate,
  tournamentName,
  tournamentFormat,
  tournamentDate,
  badges = [],
  cardStyle = 'dark',
}: PlayerShareCardProps) {
  const bg = THEME_BG[cardStyle];
  const text = THEME_TEXT[cardStyle];
  const muted = THEME_MUTED[cardStyle];
  const accent = THEME_ACCENT[cardStyle];
  const cardBg = THEME_CARD[cardStyle];
  const border = THEME_BORDER[cardStyle];
  const isLight = cardStyle === 'light';

  const date = new Date(tournamentDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formatLabel =
    TOURNAMENT_FORMAT_LABELS[tournamentFormat] ?? 'Tournament';
  const matchesLost = matchesPlayed - matchesWon;
  const winPct = Math.round(winRate * 100);

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
        <View style={styles.headerDots}>
          <View
            style={[styles.dot, { backgroundColor: Colors.opticYellow }]}
          />
          <View style={[styles.dot, { backgroundColor: Colors.violet }]} />
          <View
            style={[styles.dot, { backgroundColor: Colors.aquaGreen }]}
          />
        </View>
      </View>

      {/* ─── Player Identity ──────────────────────────────────────── */}
      <View style={styles.identity}>
        {/* Avatar */}
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: isLight
                ? ShareCardColors.lightAvatar
                : Alpha.yellow08,
              borderColor: accent,
            },
          ]}
        >
          <Text style={[styles.avatarText, { color: accent }]}>
            {getInitials(playerName)}
          </Text>
        </View>

        {/* Name */}
        <Text
          style={[styles.playerName, { color: text }]}
          numberOfLines={1}
        >
          {playerName}
        </Text>

        {/* Rank Badge */}
        <View
          style={[
            styles.rankBadge,
            { backgroundColor: cardBg, borderColor: border },
          ]}
        >
          <Text style={[styles.rankText, { color: accent }]}>
            {rank}
            {getRankSuffix(rank)}
          </Text>
          <Text style={[styles.rankOf, { color: muted }]}>
            {' '}
            of {totalPlayers}
          </Text>
        </View>
      </View>

      {/* ─── Divider ──────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* ─── Stats Grid ───────────────────────────────────────────── */}
      <View style={styles.statsGrid}>
        <View
          style={[
            styles.statCell,
            { backgroundColor: cardBg, borderColor: border },
          ]}
        >
          <Text style={[styles.statValue, { color: accent }]}>
            {matchesWon}
          </Text>
          <Text style={[styles.statLabel, { color: muted }]}>Wins</Text>
        </View>
        <View
          style={[
            styles.statCell,
            { backgroundColor: cardBg, borderColor: border },
          ]}
        >
          <Text style={[styles.statValue, { color: text }]}>
            {matchesLost}
          </Text>
          <Text style={[styles.statLabel, { color: muted }]}>Losses</Text>
        </View>
        <View
          style={[
            styles.statCell,
            { backgroundColor: cardBg, borderColor: border },
          ]}
        >
          <Text style={[styles.statValue, { color: accent }]}>
            {winPct}%
          </Text>
          <Text style={[styles.statLabel, { color: muted }]}>Win Rate</Text>
        </View>
        <View
          style={[
            styles.statCell,
            { backgroundColor: cardBg, borderColor: border },
          ]}
        >
          <Text style={[styles.statValue, { color: text }]}>
            {totalPoints}
          </Text>
          <Text style={[styles.statLabel, { color: muted }]}>Points</Text>
        </View>
      </View>

      {/* ─── Badges ───────────────────────────────────────────────── */}
      {badges.length > 0 && (
        <View style={styles.badgeRow}>
          {badges.map((badge, i) => {
            const c = BADGE_COLORS[badge.variant];
            return (
              <View
                key={i}
                style={[
                  styles.badge,
                  { backgroundColor: c.bg, borderColor: c.border },
                ]}
              >
                <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                <Text style={[styles.badgeLabel, { color: c.text }]}>
                  {badge.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ─── Divider ──────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: border }]} />

      {/* ─── Tournament Footer ────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text
          style={[styles.tournamentName, { color: text }]}
          numberOfLines={1}
        >
          {tournamentName}
        </Text>
        <Text style={[styles.meta, { color: muted }]}>
          {formatLabel} · {date}
        </Text>

        <View style={[styles.ctaRow, { borderTopColor: border }]}>
          <View
            style={[
              styles.ctaPill,
              {
                backgroundColor: isLight
                  ? Alpha.violet08
                  : Alpha.yellow08,
                borderColor: isLight
                  ? Alpha.violet20
                  : Alpha.yellow20,
              },
            ]}
          >
            <Text style={[styles.cta, { color: accent }]}>
              playsmashd.com
            </Text>
          </View>
          <Text style={[styles.tagline, { color: muted }]}>
            {AppConfig.tagline}
          </Text>
        </View>
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
  headerDots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.6,
  },

  // Identity
  identity: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 26,
  },
  playerName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 24,
    textAlign: 'center',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  rankText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  rankOf: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },

  // Divider
  divider: {
    height: 1,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCell: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontFamily: Fonts.mono,
    fontSize: 22,
  },
  statLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  tournamentName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    textAlign: 'center',
  },
  meta: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  ctaRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    width: '100%',
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
