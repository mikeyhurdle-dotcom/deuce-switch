import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Shadows, AppConfig } from '../lib/constants';
import type { TournamentFormat } from '../lib/types';
import { TOURNAMENT_FORMAT_LABELS } from '../lib/types';

// ─── Ordinal helper ─────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Types ──────────────────────────────────────────────────────────────────

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
};

// ─── Component ──────────────────────────────────────────────────────────────
// "The most important step a man can take is the next one."

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
}: PlayerShareCardProps) {
  const date = new Date(tournamentDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formatLabel = TOURNAMENT_FORMAT_LABELS[tournamentFormat] ?? 'Tournament';
  const isChampion = rank === 1;
  const isPodium = rank <= 3;

  // Medal emoji for podium finishes
  const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  // Rank colour
  const rankColor =
    rank === 1
      ? Colors.gold
      : rank === 2
        ? Colors.silver
        : rank === 3
          ? Colors.bronze
          : Colors.opticYellow;

  // Win rate colour — aquaGreen for ≥50%, coral for below
  const winRateColor = winRate >= 0.5 ? Colors.aquaGreen : Colors.coral;

  // Podium border colour (subtle glow on card edge)
  const podiumBorderColor =
    rank === 1
      ? Colors.gold
      : rank === 2
        ? Colors.silver
        : rank === 3
          ? Colors.bronze
          : undefined;

  return (
    <View
      style={[
        styles.card,
        isPodium && { borderWidth: 1, borderColor: podiumBorderColor },
        isChampion && Shadows.glowYellow,
      ]}
    >
      {/* ─── Accent Bar ──────────────────────────────────────────────── */}
      <View style={[styles.accentBar, { backgroundColor: rankColor }]} />

      {/* ─── Brand Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.brandName}>{AppConfig.name.toUpperCase()}</Text>
        <View style={styles.headerDots}>
          <View style={[styles.dot, { backgroundColor: Colors.opticYellow }]} />
          <View style={[styles.dot, { backgroundColor: Colors.violet }]} />
          <View style={[styles.dot, { backgroundColor: Colors.aquaGreen }]} />
        </View>
      </View>

      {/* ─── Hero: Player Result ───────────────────────────────────────── */}
      <View style={styles.hero}>
        {medalEmoji && <Text style={styles.medal}>{medalEmoji}</Text>}

        {isChampion && (
          <View style={styles.championBadge}>
            <Text style={styles.championLabel}>CHAMPION</Text>
          </View>
        )}

        <Text style={styles.playerName} numberOfLines={1}>
          {playerName}
        </Text>

        {/* Rank badge */}
        <View style={[styles.rankBadge, { borderColor: rankColor }]}>
          <Text style={[styles.rankText, { color: rankColor }]}>
            {ordinal(rank)}
          </Text>
          <Text style={styles.rankOf}>of {totalPlayers}</Text>
        </View>
      </View>

      {/* ─── Stats Row ─────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalPoints}</Text>
          <Text style={styles.statLabel}>POINTS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {matchesWon}/{matchesPlayed}
          </Text>
          <Text style={styles.statLabel}>WINS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: winRateColor }]}>
            {Math.round(winRate * 100)}%
          </Text>
          <Text style={styles.statLabel}>WIN RATE</Text>
        </View>
      </View>

      {/* ─── Tournament Info ───────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.tournamentName} numberOfLines={2}>
          {tournamentName}
        </Text>
        <Text style={styles.meta}>
          {formatLabel} · {date}
        </Text>

        {/* CTA */}
        <View style={styles.ctaRow}>
          <View style={styles.ctaPill}>
            <Text style={styles.cta}>playsmashd.com</Text>
          </View>
          <Text style={styles.tagline}>{AppConfig.tagline}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: 390,
    backgroundColor: Colors.darkBg,
    paddingTop: 0,
    paddingBottom: 36,
    paddingHorizontal: 28,
    gap: 20,
    overflow: 'hidden',
  },

  // Accent bar — thin coloured strip at the very top
  accentBar: {
    height: 3,
    width: '100%',
    marginBottom: 8,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 20,
  },
  brandName: {
    fontFamily: Fonts.mono,
    fontSize: 28,
    color: Colors.opticYellow,
    letterSpacing: 10,
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

  // Hero
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  medal: {
    fontSize: 60,
    marginBottom: 2,
  },
  championBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  championLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 5,
  },
  playerName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  rankText: {
    fontFamily: Fonts.mono,
    fontSize: 22,
    letterSpacing: 1,
  },
  rankOf: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.textDim,
    letterSpacing: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: Colors.opticYellow,
  },
  statLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 2.5,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  tournamentName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  meta: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  ctaRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: '100%',
  },
  ctaPill: {
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.2)',
  },
  cta: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.opticYellow,
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
