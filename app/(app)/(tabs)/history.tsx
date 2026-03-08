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
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Fonts } from '../../../src/lib/constants';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { ListSkeleton } from '../../../src/components/ui/Skeleton';
import type { TournamentFormat } from '../../../src/lib/types';

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

export default function History() {
  const { user } = useAuth();
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

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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

  const handleTournamentPress = (item: TournamentHistoryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>HISTORY</Text>
          <ListSkeleton count={4} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
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
        <Text style={styles.title}>HISTORY</Text>

        {tournaments.length === 0 ? (
          <Card>
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No tournaments yet</Text>
              <Text style={styles.emptyDesc}>
                Create or join a tournament to get started.
              </Text>
              <View style={styles.emptyCtas}>
                <Button
                  title="CREATE"
                  onPress={() => router.push('/(app)/tournament/create')}
                  variant="primary"
                  size="md"
                />
                <Button
                  title="JOIN"
                  onPress={() => router.push('/(app)/join')}
                  variant="outline"
                  size="md"
                />
              </View>
            </View>
          </Card>
        ) : (
          <View style={styles.list}>
            {tournaments.map((item) => (
              <Pressable
                key={item.tournament_id}
                onPress={() => handleTournamentPress(item)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
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
              </Pressable>
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
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
  },
  emptyCtas: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
