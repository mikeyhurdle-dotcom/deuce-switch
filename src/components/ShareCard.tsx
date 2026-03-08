import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Shadows, AppConfig } from '../lib/constants';
import type { AmericanoStanding, TournamentFormat } from '../lib/types';
import { TOURNAMENT_FORMAT_LABELS } from '../lib/types';

type ShareCardProps = {
  tournamentName: string;
  tournamentFormat: TournamentFormat;
  createdAt: string;
  standings: AmericanoStanding[];
};

export function ShareCard({
  tournamentName,
  tournamentFormat,
  createdAt,
  standings,
}: ShareCardProps) {
  const winner = standings[0] ?? null;
  const date = new Date(createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formatLabel = TOURNAMENT_FORMAT_LABELS[tournamentFormat] ?? 'Tournament';

  return (
    <View style={styles.card}>
      {/* Accent bar */}
      <View style={styles.accentBar} />

      {/* Brand Header */}
      <View style={styles.header}>
        <Text style={styles.brandName}>{AppConfig.name.toUpperCase()}</Text>
        <View style={styles.headerDots}>
          <View style={[styles.dot, { backgroundColor: Colors.opticYellow }]} />
          <View style={[styles.dot, { backgroundColor: Colors.violet }]} />
          <View style={[styles.dot, { backgroundColor: Colors.aquaGreen }]} />
        </View>
      </View>

      {/* Champion */}
      {winner && (
        <View style={[styles.champion, Shadows.glowYellow]}>
          <Text style={styles.trophy}>🏆</Text>
          <View style={styles.championBadge}>
            <Text style={styles.championLabel}>CHAMPION</Text>
          </View>
          <Text style={styles.championName}>{winner.displayName}</Text>
          <Text style={styles.championPoints}>{winner.pointsFor} points</Text>
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Standings */}
      <View style={styles.standings}>
        <Text style={styles.standingsTitle}>FINAL STANDINGS</Text>
        {standings.map((entry, i) => {
          const borderColor =
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
                i < 3 && { borderWidth: 1, borderColor },
              ]}
            >
              <Text
                style={[
                  styles.rank,
                  i === 0 && styles.gold,
                  i === 1 && styles.silver,
                  i === 2 && styles.bronze,
                ]}
              >
                {i + 1}
              </Text>
              <Text style={styles.playerName} numberOfLines={1}>
                {entry.displayName}
              </Text>
              <Text style={styles.playerPoints}>{entry.pointsFor}</Text>
            </View>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.tournamentName}>{tournamentName}</Text>
        <Text style={styles.meta}>
          {formatLabel} · {date}
        </Text>
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

const styles = StyleSheet.create({
  card: {
    width: 390,
    backgroundColor: Colors.darkBg,
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
  champion: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  trophy: {
    fontSize: 52,
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
    color: Colors.textDim,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  standings: {
    gap: 6,
  },
  standingsTitle: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  rank: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    color: Colors.textDim,
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
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  meta: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  ctaRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 12,
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
});
