import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Fonts } from '../../../src/lib/constants';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { ListSkeleton } from '../../../src/components/ui/Skeleton';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AnimatedPressable, useSpringPress } from '../../../src/hooks/useSpringPress';
import type { TournamentFormat } from '../../../src/lib/types';

const ROW_STAGGER = 60; // ms between each tournament card animation

type TournamentHistoryItem = {
  tournament_id: string;
  tournament: {
    id: string;
    name: string;
    tournament_format: TournamentFormat;
    status: 'draft' | 'running' | 'completed';
    created_at: string;
  };
  playerCount: number;
};

// ── Animated Tournament Card ─────────────────────────────────────────────────
function AnimatedTournamentCard({
  item,
  index,
  onPress,
}: {
  item: TournamentHistoryItem;
  index: number;
  onPress: (item: TournamentHistoryItem) => void;
}) {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = useSpringPress();

  useEffect(() => {
    const delay = 150 + index * ROW_STAGGER;
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const formatLabel = (format: TournamentFormat) => {
    const labels: Record<TournamentFormat, string> = {
      americano: 'Americano',
      mexicano: 'Mexicano',
      team_americano: 'Team',
      mixicano: 'Mixicano',
    };
    return labels[format] ?? format;
  };

  const statusVariant = (
    status: string,
  ): 'success' | 'info' | 'default' | 'warning' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Animated.View style={entranceStyle}>
      <AnimatedPressable
        style={pressStyle}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress(item);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${item.tournament.name}, ${formatLabel(item.tournament.tournament_format)}, ${item.playerCount} players, ${item.tournament.status}`}
      >
        <Card>
          <View style={styles.tournamentCard}>
            <View style={styles.tournamentHeader}>
              <Text style={styles.tournamentName} numberOfLines={1}>
                {item.tournament.name}
              </Text>
              <Badge
                label={item.tournament.status.toUpperCase()}
                variant={statusVariant(item.tournament.status)}
              />
            </View>
            <View style={styles.tournamentMeta}>
              <Text style={styles.metaText}>
                {formatLabel(item.tournament.tournament_format)}
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>
                {item.playerCount} players
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>
                {formatDate(item.tournament.created_at)}
              </Text>
            </View>
          </View>
        </Card>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tournament_players')
        .select(
          `
          tournament_id,
          tournaments (
            id,
            name,
            tournament_format,
            status,
            created_at
          )
        `,
        )
        .eq('player_id', user.id)
        .eq('tournament_status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const raw = (data ?? []) as any[];
      const items: TournamentHistoryItem[] = await Promise.all(
        raw
          .filter((r) => r.tournaments) // skip if join failed
          .map(async (r) => {
            const { count } = await supabase
              .from('tournament_players')
              .select('id', { count: 'exact', head: true })
              .eq('tournament_id', r.tournament_id)
              .eq('tournament_status', 'active');

            return {
              tournament_id: r.tournament_id,
              tournament: r.tournaments,
              playerCount: count ?? 0,
            };
          }),
      );

      setTournaments(items);
    } catch {
      // Fail silently — empty state handles it
    } finally {
      setLoading(false);
    }
  }, [user]);

  // PLA-471: Wait for AuthProvider to settle before firing any fetches.
  useEffect(() => {
    if (authLoading) return;
    fetchHistory();
  }, [authLoading, fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  const handleTournamentPress = (item: TournamentHistoryItem) => {
    const tid = item.tournament.id;
    if (item.tournament.status === 'completed') {
      router.push(`/(app)/tournament/${tid}/results`);
    } else if (item.tournament.status === 'running') {
      router.push(`/(app)/tournament/${tid}/play`);
    } else {
      router.push(`/(app)/tournament/${tid}/lobby`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView testID="screen-history" style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>HISTORY</Text>
          <ListSkeleton count={4} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID="screen-history" style={styles.safe}>
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
        <Animated.View entering={FadeInDown.duration(350).springify()}>
          <Text style={styles.title}>HISTORY</Text>
        </Animated.View>

        {tournaments.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            iconColor={Colors.opticYellow}
            badgeIcon="add-circle-outline"
            title="No tournaments yet"
            subtitle="Create or join a tournament to start tracking your history"
            actions={[
              {
                label: 'CREATE',
                onPress: () => router.push('/(app)/tournament/create'),
                variant: 'primary',
                testID: 'btn-create-tournament',
              },
              {
                label: 'JOIN',
                onPress: () => router.push('/(app)/join'),
                variant: 'secondary',
                testID: 'btn-join-tournament',
              },
            ]}
            testID="state-history-empty"
          />
        ) : (
          <View style={styles.list}>
            {tournaments.map((item, index) => (
              <AnimatedTournamentCard
                key={item.tournament_id}
                item={item}
                index={index}
                onPress={handleTournamentPress}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: 3,
  },
  list: {
    gap: 12,
  },
  tournamentCard: {
    gap: 8,
    paddingVertical: 4,
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tournamentName: {
    flex: 1,
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  tournamentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  metaDot: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
