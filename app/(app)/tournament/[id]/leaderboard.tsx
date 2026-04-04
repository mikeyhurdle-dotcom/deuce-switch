import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '../../../../src/providers/AuthProvider';
import { useTournament } from '../../../../src/hooks/useTournament';
import { Colors, Fonts, Radius, Spacing } from '../../../../src/lib/constants';
import { EmptyState } from '../../../../src/components/ui/EmptyState';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

function getMedalColor(index: number): string | undefined {
  if (index === 0) return Colors.gold;
  if (index === 1) return Colors.silver;
  if (index === 2) return Colors.bronze;
  return undefined;
}

// ── Animated Row ──────────────────────────────────────────────────────────────

const ROW_STAGGER = 60; // ms between each row animation

interface Standing {
  playerId: string;
  displayName: string;
  pointsFor: number;
  wins: number;
  losses?: number;
  matchesPlayed: number;
}

function LeaderboardRow({
  entry,
  index,
  isMe,
}: {
  entry: Standing;
  index: number;
  isMe: boolean;
}) {
  const medal = getMedalColor(index);
  const translateY = useSharedValue(24);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = 200 + index * ROW_STAGGER;
    opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const losses = entry.losses ?? Math.max(0, entry.matchesPlayed - entry.wins);

  return (
    <Animated.View
      style={[
        styles.row,
        medal != null && { borderLeftWidth: 3, borderLeftColor: medal },
        isMe && styles.myRow,
        animStyle,
      ]}
    >
      {/* Rank */}
      <View style={styles.rankCol}>
        <Text
          style={[
            styles.rank,
            index === 0 && styles.goldText,
            index === 1 && styles.silverText,
            index === 2 && styles.bronzeText,
          ]}
        >
          {index + 1}
        </Text>
      </View>

      {/* Avatar + Name */}
      <View style={styles.playerCol}>
        <View
          style={[
            styles.avatar,
            { borderColor: medal ?? Colors.surfaceLight },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              medal != null && { color: medal },
            ]}
          >
            {getInitials(entry.displayName)}
          </Text>
        </View>
        <View style={styles.nameWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {entry.displayName}
          </Text>
          {isMe && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>YOU</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats */}
      <Text style={[styles.stat, styles.wCol, styles.winText]}>{entry.wins}</Text>
      <Text style={[styles.stat, styles.lCol, styles.lossText]}>{losses}</Text>
      <Text style={[styles.points, styles.ptsCol]}>{entry.pointsFor}</Text>
    </Animated.View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { tournament, standings, players, loading, refetch } = useTournament(id ?? null);
  const [refreshing, setRefreshing] = useState(false);

  // Anonymise names if the organiser toggled it on
  const displayStandings = useMemo(() => {
    if (!tournament?.anonymise_players) return standings;
    const anonMap = new Map(
      players.map((p, i) => [p.playerId, `Player ${i + 1}`]),
    );
    return standings.map((entry) => ({
      ...entry,
      displayName: anonMap.get(entry.playerId) ?? 'Player',
    }));
  }, [standings, players, tournament?.anonymise_players]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.opticYellow} />
          <Text style={styles.loadingText}>Loading leaderboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{
        headerTitle: () => (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: Colors.textPrimary, letterSpacing: 2 }}>LEADERBOARD</Text>
            <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted }} numberOfLines={1}>{tournament?.name ?? ''}</Text>
          </View>
        ),
      }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.opticYellow}
            />
          }
        >
          {/* Tournament title */}
          <Text style={styles.title}>{tournament?.name ?? 'Tournament'}</Text>

          {/* Subtitle — round info */}
          {tournament?.current_round != null && (
            <Text style={styles.subtitle}>
              Round {tournament.current_round}
              {tournament.status === 'running' ? ' · Live' : ''}
            </Text>
          )}

          {displayStandings.length === 0 ? (
            <EmptyState
              icon="podium-outline"
              iconColor={Colors.opticYellow}
              title="No scores yet"
              subtitle="Scores will appear here after the first round"
              testID="state-leaderboard-empty"
            />
          ) : (
            <View style={styles.list}>
              {/* Column headers */}
              <View style={styles.headerRow}>
                <View style={styles.rankCol}>
                  <Text style={styles.headerText}>#</Text>
                </View>
                <View style={styles.playerCol}>
                  <Text style={styles.headerText}>PLAYER</Text>
                </View>
                <Text style={[styles.headerText, styles.wCol]}>W</Text>
                <Text style={[styles.headerText, styles.lCol]}>L</Text>
                <Text style={[styles.headerText, styles.ptsCol]}>PTS</Text>
              </View>

              {/* Rows */}
              {displayStandings.map((entry: Standing, i: number) => (
                <LeaderboardRow
                  key={entry.playerId}
                  entry={entry}
                  index={i}
                  isMe={entry.playerId === user?.id}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textDim,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[10],
    gap: Spacing[4],
  },

  // ── Header
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.aquaGreen,
    textAlign: 'center',
    marginTop: -8,
  },

  // ── List
  list: { gap: 3 },

  // ── Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    marginBottom: Spacing[1],
  },
  headerText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
  },
  myRow: {
    borderWidth: 1.5,
    borderColor: Colors.opticYellow,
  },

  // ── Column widths
  rankCol: { width: 28, alignItems: 'center' as const },
  playerCol: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing[2],
  },
  wCol: { width: 34, textAlign: 'center' as const },
  lCol: { width: 34, textAlign: 'center' as const },
  ptsCol: { width: 44, textAlign: 'center' as const },

  // ── Rank
  rank: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.textDim,
  },

  // ── Avatar
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
  },

  // ── Name + YOU badge
  nameWrap: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing[2],
  },
  name: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: Colors.opticYellow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.darkBg,
    letterSpacing: 0.5,
  },

  // ── Stats
  stat: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  winText: { color: Colors.success },
  lossText: { color: Colors.error },
  points: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.opticYellow,
  },

  // ── Medal text
  goldText: { color: Colors.gold },
  silverText: { color: Colors.silver },
  bronzeText: { color: Colors.bronze },
});
