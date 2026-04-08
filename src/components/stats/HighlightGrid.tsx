import { StyleSheet, Text, View } from 'react-native';
import { CountUp } from '../ui/CountUp';
import { Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import type { PlayerStats } from '../../services/stats-service';

type Props = {
  stats: PlayerStats;
};

export function HighlightGrid({ stats }: Props) {
  const streakLabel =
    stats.currentStreak.count > 0
      ? `${stats.currentStreak.type}${stats.currentStreak.count}`
      : '-';

  return (
    <View style={styles.grid}>
      <View style={styles.cell}>
        <CountUp value={stats.matchesPlayed} style={[styles.value, { color: Colors.opticYellow }]} />
        <Text style={styles.label}>Matches</Text>
      </View>
      <View style={styles.cell}>
        <CountUp value={stats.winRate} suffix="%" style={[styles.value, { color: Colors.aquaGreen }]} />
        <Text style={styles.label}>Win Rate</Text>
      </View>
      <View style={styles.cell}>
        <CountUp value={stats.tournamentCount} style={[styles.value, { color: Colors.gold }]} />
        <Text style={styles.label}>Tournaments</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.value}>{streakLabel}</Text>
        <Text style={styles.label}>Streak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  cell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    alignItems: 'center',
    gap: 2,
  },
  value: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
