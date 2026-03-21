/**
 * Stats visualization components — Rating Progression, Win Rate Trend, Match History.
 * Uses react-native-svg for charts (no native Skia dependency), Electric Court design system.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Colors, Fonts, Spacing, Radius } from '../lib/constants';
import type {
  RatingPoint,
  WinRatePoint,
  MatchHistoryItem,
} from '../services/stats-service';

// ─── Platform Colors ────────────────────────────────────────────────────────

const PLATFORM_CHART_COLORS: Record<string, string> = {
  nettla: '#4A90D9',
  playtomic: '#00D4AA',
  padelmates: '#FF6B35',
  matchii: '#E91E63',
};

const PLATFORM_LABELS: Record<string, string> = {
  nettla: 'Nettla',
  playtomic: 'Playtomic',
  padelmates: 'Padel Mates',
  matchii: 'Matchii',
};

// ─── SVG Chart Helpers ──────────────────────────────────────────────────────

const CHART_WIDTH = 300;
const CHART_HEIGHT = 150;
const CHART_PADDING = { top: 20, right: 16, bottom: 24, left: 40 };

function buildSmoothPath(
  points: { x: number; y: number }[],
  tension: number = 0.3,
): string {
  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

function mapToChartPoints(
  data: number[],
  width: number,
  height: number,
  minVal: number,
  maxVal: number,
): { x: number; y: number }[] {
  const plotW = width - CHART_PADDING.left - CHART_PADDING.right;
  const plotH = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const range = maxVal - minVal || 1;

  return data.map((val, i) => ({
    x: CHART_PADDING.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: CHART_PADDING.top + plotH - ((val - minVal) / range) * plotH,
  }));
}

/** Generic SVG line chart with gradient fill */
function SvgLineChart({
  data,
  width,
  height,
  color,
  yMin,
  yMax,
  yLabels,
  gradientId,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
  yMin?: number;
  yMax?: number;
  yLabels?: string[];
  gradientId: string;
}) {
  if (data.length < 2) return null;

  const min = yMin ?? Math.min(...data);
  const max = yMax ?? Math.max(...data);
  const points = mapToChartPoints(data, width, height, min, max);
  const linePath = buildSmoothPath(points);

  // Build area path (line + close to bottom)
  const plotBottom = height - CHART_PADDING.bottom;
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${plotBottom} L ${points[0].x} ${plotBottom} Z`;

  // Y-axis labels
  const plotH = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const ticks = yLabels ?? [
    max.toFixed(1),
    ((max + min) / 2).toFixed(1),
    min.toFixed(1),
  ];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Y-axis grid lines + labels */}
      {ticks.map((label, i) => {
        const y = CHART_PADDING.top + (i / (ticks.length - 1)) * plotH;
        return (
          <Line
            key={`grid-${i}`}
            x1={CHART_PADDING.left}
            y1={y}
            x2={width - CHART_PADDING.right}
            y2={y}
            stroke={Colors.border}
            strokeWidth={0.5}
            strokeDasharray="4 4"
          />
        );
      })}

      {ticks.map((label, i) => {
        const y = CHART_PADDING.top + (i / (ticks.length - 1)) * plotH;
        return (
          <SvgText
            key={`label-${i}`}
            x={CHART_PADDING.left - 6}
            y={y + 4}
            fill={Colors.textMuted}
            fontSize={10}
            textAnchor="end"
            fontFamily="SpaceMono"
          >
            {label}
          </SvgText>
        );
      })}

      {/* Gradient fill area */}
      <Path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />

      {/* Data point dots (first, last, and every ~5th) */}
      {points.map((pt, i) => {
        const show = i === 0 || i === points.length - 1 || (points.length > 8 && i % Math.ceil(points.length / 5) === 0);
        if (!show) return null;
        return (
          <Circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r={3} fill={color} stroke={Colors.card} strokeWidth={1.5} />
        );
      })}
    </Svg>
  );
}

// ─── Rating Progression Chart ───────────────────────────────────────────────

type RatingChartProps = {
  ratings: RatingPoint[];
};

export function RatingProgressionChart({ ratings }: RatingChartProps) {
  if (ratings.length < 2) return null;

  const platforms = [...new Set(ratings.map((r) => r.platform))];
  const [activePlatform, setActivePlatform] = useState(platforms[0]);

  const platformData = ratings
    .filter((r) => r.platform === activePlatform)
    .map((r) => r.rating);

  if (platformData.length < 2) return null;

  const currentRating = platformData[platformData.length - 1];
  const startRating = platformData[0];
  const delta = currentRating - startRating;
  const lineColor = PLATFORM_CHART_COLORS[activePlatform] ?? Colors.opticYellow;

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>Rating Progression</Text>
          <View style={styles.ratingRow}>
            <Text style={[styles.ratingCurrent, { color: lineColor }]}>
              {currentRating.toFixed(2)}
            </Text>
            <Text style={[styles.ratingDelta, { color: delta >= 0 ? Colors.success : Colors.error }]}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {platforms.length > 1 && (
        <View style={styles.platformSelector}>
          {platforms.map((p) => (
            <Pressable
              key={p}
              style={[
                styles.platformPill,
                activePlatform === p && { backgroundColor: (PLATFORM_CHART_COLORS[p] ?? Colors.opticYellow) + '20', borderColor: PLATFORM_CHART_COLORS[p] ?? Colors.opticYellow },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActivePlatform(p);
              }}
            >
              <Text style={[styles.platformPillText, { color: PLATFORM_CHART_COLORS[p] ?? Colors.textDim }]}>
                {PLATFORM_LABELS[p] ?? p}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.chartContainer}>
        <SvgLineChart
          data={platformData}
          width={CHART_WIDTH}
          height={160}
          color={lineColor}
          gradientId={`rating-grad-${activePlatform}`}
        />
      </View>
    </View>
  );
}

// ─── Win Rate Trend ─────────────────────────────────────────────────────────

type WinRateTrendProps = {
  data: WinRatePoint[];
};

export function WinRateTrendChart({ data }: WinRateTrendProps) {
  if (data.length < 3) return null;

  const chartData = data.map((d) => d.rollingWinRate);
  const currentRate = chartData[chartData.length - 1];
  const trendUp = chartData.length >= 2 && chartData[chartData.length - 1] >= chartData[Math.floor(chartData.length / 2)];

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>Win Rate Trend</Text>
          <Text style={styles.chartSubtitle}>Rolling 5-match window</Text>
        </View>
        <View style={styles.trendBadge}>
          <Ionicons
            name={trendUp ? 'trending-up' : 'trending-down'}
            size={16}
            color={trendUp ? Colors.success : Colors.error}
          />
          <Text style={[styles.trendValue, { color: trendUp ? Colors.success : Colors.error }]}>
            {currentRate}%
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <SvgLineChart
          data={chartData}
          width={CHART_WIDTH}
          height={160}
          color={Colors.opticYellow}
          yMin={0}
          yMax={100}
          yLabels={['100%', '50%', '0%']}
          gradientId="winrate-grad"
        />
      </View>
    </View>
  );
}

// ─── Match History Feed ─────────────────────────────────────────────────────

type MatchHistoryProps = {
  matches: MatchHistoryItem[];
  onLoadMore?: () => void;
};

const SOURCE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  screenshot: 'camera-outline',
  manual: 'create-outline',
  americano: 'trophy-outline',
  mexicano: 'trophy-outline',
  team_americano: 'people-outline',
  mixicano: 'shuffle-outline',
  playtomic: 'globe-outline',
  open_game: 'tennisball-outline',
};

export function MatchHistoryFeed({ matches, onLoadMore }: MatchHistoryProps) {
  if (matches.length === 0) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Match History</Text>
        <Text style={styles.sectionSubtitle}>{matches.length} matches</Text>
      </View>

      {matches.map((match, index) => (
        <View
          key={match.id}
          style={[styles.historyRow, index === matches.length - 1 && { marginBottom: 0 }]}
        >
          <View style={[styles.historyIndicator, match.won ? styles.historyWin : styles.historyLoss]} />
          <View style={styles.historyContent}>
            <View style={styles.historyTopRow}>
              <Text style={styles.historyDate}>{formatDate(match.date)}</Text>
              <View style={styles.historyScoreBadge}>
                <Text style={[styles.historyScore, match.won ? { color: Colors.success } : { color: Colors.error }]}>
                  {match.teamScore} - {match.opponentScore}
                </Text>
              </View>
            </View>

            {match.setScores && match.setScores.length > 0 && (
              <View style={styles.historySets}>
                {match.setScores.map((set, si) => (
                  <Text key={si} style={styles.historySetText}>{set.team_a}-{set.team_b}</Text>
                ))}
              </View>
            )}

            <View style={styles.historyPlayers}>
              {match.partnerName && (
                <Text style={styles.historyPlayerText}>w/ {match.partnerName}</Text>
              )}
              {match.opponent1Name && (
                <Text style={styles.historyOpponentText}>
                  vs {match.opponent1Name}{match.opponent2Name ? ` & ${match.opponent2Name}` : ''}
                </Text>
              )}
            </View>

            <View style={styles.historyMeta}>
              {match.venue && (
                <View style={styles.historyMetaItem}>
                  <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                  <Text style={styles.historyMetaText}>{match.venue}</Text>
                </View>
              )}
              <View style={styles.historyMetaItem}>
                <Ionicons name={SOURCE_ICONS[match.source] ?? 'ellipse-outline'} size={11} color={Colors.textMuted} />
                <Text style={styles.historyMetaText}>
                  {match.matchType === 'friendly' ? 'Friendly' : match.matchType === 'tournament' ? 'Tournament' : 'Competitive'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      {onLoadMore && matches.length >= 20 && (
        <Pressable
          style={styles.loadMoreBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLoadMore();
          }}
        >
          <Text style={styles.loadMoreText}>Load more</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing[2],
  },
  chartTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  chartSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chartContainer: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  ratingCurrent: {
    fontFamily: Fonts.bodyBold,
    fontSize: 24,
  },
  ratingDelta: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },
  platformSelector: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  platformPill: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  platformPillText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  trendValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
    marginTop: Spacing[4],
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  historyRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    marginBottom: Spacing[2],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyIndicator: {
    width: 4,
  },
  historyWin: {
    backgroundColor: Colors.success,
  },
  historyLoss: {
    backgroundColor: Colors.error,
  },
  historyContent: {
    flex: 1,
    padding: Spacing[3],
    gap: 4,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  historyScoreBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  historyScore: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },
  historySets: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  historySetText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textDim,
  },
  historyPlayers: {
    gap: 2,
  },
  historyPlayerText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.aquaGreen,
  },
  historyOpponentText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },
  historyMeta: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: 2,
  },
  historyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  historyMetaText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing[3],
  },
  loadMoreText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.opticYellow,
  },
});
