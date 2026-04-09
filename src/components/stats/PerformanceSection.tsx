import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { WinRateTrendChart } from '../StatsCharts';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import type { PlayerStats } from '../../services/stats-service';

type Props = {
  stats: PlayerStats;
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.barBg}>
      <View style={[styles.barFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

const BD_COLORS = [Colors.opticYellow, Colors.aquaGreen, Colors.violet, Colors.coral, Colors.gold];

export function PerformanceSection({ stats }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasBreakdowns =
    stats.formatBreakdown.length > 0 || stats.conditionsBreakdown.length > 0;
  const hasTrend = stats.winRateTrend.length > 2;

  if (!hasBreakdowns && !hasTrend) return null;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse performance' : 'Expand performance'}
      >
        <Ionicons name="trending-up" size={16} color={Colors.aquaGreen} />
        <Text style={styles.title}>Performance</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textMuted}
        />
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          {/* Win Rate Trend */}
          {hasTrend && <WinRateTrendChart data={stats.winRateTrend} />}

          {/* Format Breakdown */}
          {stats.formatBreakdown.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.bdTitle}>By Format</Text>
              {stats.formatBreakdown.map((item, i) => (
                <View key={item.label} style={i > 0 ? { marginTop: 6 } : undefined}>
                  <View style={styles.bdRow}>
                    <Text style={styles.bdLabel}>{item.label}</Text>
                    <Text style={[styles.bdValue, { color: BD_COLORS[i % BD_COLORS.length] }]}>
                      {item.winRate}%
                    </Text>
                  </View>
                  <ProgressBar value={item.winRate} color={BD_COLORS[i % BD_COLORS.length]} />
                </View>
              ))}
            </View>
          )}

          {/* Conditions Breakdown */}
          {stats.conditionsBreakdown.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.bdTitle}>By Conditions</Text>
              {stats.conditionsBreakdown.map((item, i) => (
                <View key={item.label} style={i > 0 ? { marginTop: 6 } : undefined}>
                  <View style={styles.bdRow}>
                    <Text style={styles.bdLabel}>{item.label}</Text>
                    <Text style={[styles.bdValue, { color: BD_COLORS[i % BD_COLORS.length] }]}>
                      {item.winRate}%
                    </Text>
                  </View>
                  <ProgressBar value={item.winRate} color={BD_COLORS[i % BD_COLORS.length]} />
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[4],
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  breakdownCard: {
    padding: Spacing[4],
    paddingTop: 0,
  },
  bdTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing[2],
  },
  bdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  bdLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  bdValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  barBg: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
});
