import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Shadows, AppConfig, ShareCardColors } from '../lib/constants';
import type { AmericanoStanding, TournamentFormat } from '../lib/types';
import { TOURNAMENT_FORMAT_LABELS } from '../lib/types';
import Logo from '../../assets/images/smashd-logo.svg';

export type ShareTheme = 'dark' | 'neon' | 'violet' | 'light';

type ShareCardProps = {
  tournamentName: string;
  tournamentFormat: TournamentFormat;
  createdAt: string;
  standings: AmericanoStanding[];
  theme?: ShareTheme;
};

const THEME_BG: Record<ShareTheme, string> = {
  dark: ShareCardColors.darkBg,
  neon: ShareCardColors.neonBg,
  violet: ShareCardColors.violetBg,
  light: ShareCardColors.lightBg,
};

export function ShareCard({
  tournamentName,
  tournamentFormat,
  createdAt,
  standings,
  theme = 'dark',
}: ShareCardProps) {
  const isLight = theme === 'light';
  const winner = standings[0] ?? null;
  const date = new Date(createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formatLabel = TOURNAMENT_FORMAT_LABELS[tournamentFormat] ?? 'Tournament';

  // Theme-aware text colours
  const textPrimary = isLight ? ShareCardColors.lightText : Colors.textPrimary;
  const textDim = isLight ? ShareCardColors.lightMuted : Colors.textDim;
  const textMuted = isLight ? ShareCardColors.lightMuted : Colors.textMuted;
  const cardBg = isLight ? ShareCardColors.lightCard : Colors.card;
  const borderCol = isLight ? 'rgba(0,0,0,0.08)' : Colors.border;

  return (
    <View style={[styles.card, { backgroundColor: THEME_BG[theme] }]}>
      {/* Accent bar */}
      <View style={styles.accentBar} />

      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoWrap}>
            <Logo width={32} height={32} />
          </View>
          <Text style={[styles.brandName, isLight && { color: ShareCardColors.lightText }]}>
            {AppConfig.name.toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerDots}>
          <View style={[styles.dot, { backgroundColor: Colors.opticYellow }]} />
          <View style={[styles.dot, { backgroundColor: Colors.violet }]} />
          <View style={[styles.dot, { backgroundColor: Colors.aquaGreen }]} />
        </View>
      </View>

      {/* Champion */}
      {winner && (
        <View style={[styles.champion, !isLight && Shadows.glowYellow]}>
          <Text style={styles.trophy}>🏆</Text>
          <View style={styles.championBadge}>
            <Text style={styles.championLabel}>CHAMPION</Text>
          </View>
          <Text style={styles.championName}>{winner.displayName}</Text>
          <Text style={[styles.championPoints, { color: textDim }]}>
            {winner.pointsFor} points
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: borderCol }]} />

      {/* Standings */}
      <View style={styles.standings}>
        <Text style={[styles.standingsTitle, { color: textMuted }]}>
          FINAL STANDINGS
        </Text>
        {standings.map((entry, i) => {
          const medalBorderColor =
            i === 0
              ? Colors.gold
              : i === 1
                ? Colors.silver
                : i === 2
                  ? Colors.bronze
                  : undefined;
          return (
            <View
              key={entry.playerId}
              style={[
                styles.row,
                { backgroundColor: cardBg },
                i < 3 && { borderWidth: 1, borderColor: medalBorderColor },
              ]}
            >
              <Text
                style={[
                  styles.rank,
                  { color: textDim },
                  i === 0 && styles.gold,
                  i === 1 && styles.silver,
                  i === 2 && styles.bronze,
                ]}
              >
                {i + 1}
              </Text>
              <Text
                style={[styles.playerName, { color: textPrimary }]}
                numberOfLines={1}
              >
                {entry.displayName}
              </Text>
              <Text style={styles.playerPoints}>{entry.pointsFor}</Text>
            </View>
          );
        })}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: borderCol }]}>
        <Text style={[styles.tournamentName, { color: textPrimary }]}>
          {tournamentName}
        </Text>
        <Text style={[styles.meta, { color: textDim }]}>
          {formatLabel} · {date}
        </Text>
        <View style={[styles.ctaRow, { borderTopColor: borderCol }]}>
          <View style={styles.ctaPill}>
            <Text style={styles.cta}>playsmashd.com</Text>
          </View>
          <Text style={[styles.tagline, { color: textMuted }]}>
            {AppConfig.tagline}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 390,
    paddingTop: 0,
    paddingBottom: 32,
    paddingHorizontal: 28,
    gap: 18,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
    width: '100%',
    backgroundColor: Colors.opticYellow,
    marginBottom: 4,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
  },
  brandName: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: Colors.opticYellow,
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
  champion: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  trophy: {
    fontSize: 52,
  },
  championBadge: {
    backgroundColor: `${Colors.gold}1F`,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
  },
  championLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.gold,
    letterSpacing: 4,
  },
  championName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 28,
    color: Colors.opticYellow,
    textAlign: 'center',
  },
  championPoints: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  divider: {
    height: 1,
  },
  standings: {
    gap: 6,
  },
  standingsTitle: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 2.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  rank: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  gold: { color: Colors.gold },
  silver: { color: Colors.silver },
  bronze: { color: Colors.bronze },
  playerName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  playerPoints: {
    fontFamily: Fonts.mono,
    fontSize: 17,
    color: Colors.opticYellow,
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  tournamentName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    textAlign: 'center',
  },
  meta: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: Fonts.body,
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
});
