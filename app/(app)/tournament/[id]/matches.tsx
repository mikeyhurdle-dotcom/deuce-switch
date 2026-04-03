import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../src/providers/AuthProvider';
import {
  getMatchResultsForTournament,
  getTournament,
} from '../../../../src/services/tournament-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../../../src/lib/constants';
import { Badge } from '../../../../src/components/ui/Badge';
import type { Match, Tournament } from '../../../../src/lib/types';

export default function TournamentMatches() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerNames, setPlayerNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    try {
      const [t, results] = await Promise.all([
        getTournament(id),
        getMatchResultsForTournament(id, user.id),
      ]);
      setTournament(t);
      setMatches(results.map((r) => r.match));
      if (results.length > 0) {
        setPlayerNames(results[0].playerNames);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const pName = (pid: string) => playerNames.get(pid) ?? 'Player';

  // Group matches by round
  const rounds = useMemo(() => {
    const grouped = new Map<number, Match[]>();
    for (const m of matches) {
      const existing = grouped.get(m.round_number) ?? [];
      existing.push(m);
      grouped.set(m.round_number, existing);
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  if (loading) {
    return (
      <SafeAreaView testID="screen-tournament-matches" style={styles.safe}>
        <Stack.Screen options={{ title: 'MATCHES', headerShown: true }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.opticYellow} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID="screen-tournament-matches" style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: tournament?.name?.toUpperCase() ?? 'MATCHES',
          headerShown: true,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.opticYellow}
          />
        }
      >
        {/* Tournament Summary */}
        {tournament && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{matches.length}</Text>
                <Text style={styles.summaryLabel}>MATCHES</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{rounds.length}</Text>
                <Text style={styles.summaryLabel}>ROUNDS</Text>
              </View>
              <View style={styles.summaryItem}>
                <Badge
                  label={tournament.status.toUpperCase()}
                  variant={
                    tournament.status === 'completed'
                      ? 'success'
                      : tournament.status === 'running'
                        ? 'info'
                        : 'default'
                  }
                />
                <Text style={styles.summaryLabel}>STATUS</Text>
              </View>
            </View>
          </View>
        )}

        {/* Match List by Round */}
        {rounds.map(([roundNum, roundMatches], roundIdx) => (
          <Animated.View
            key={roundNum}
            entering={FadeInDown.delay(roundIdx * 60).springify()}
            style={styles.roundSection}
          >
            <Text style={styles.roundTitle}>ROUND {roundNum}</Text>
            {roundMatches.map((m) => {
              const userInTeamA = user
                ? [m.player1_id, m.player2_id].includes(user.id)
                : false;
              const userInTeamB = user
                ? [m.player3_id, m.player4_id].includes(user.id)
                : false;
              const hasScore = m.team_a_score != null && m.team_b_score != null;
              const won = hasScore
                ? userInTeamA
                  ? m.team_a_score! > m.team_b_score!
                  : userInTeamB
                    ? m.team_b_score! > m.team_a_score!
                    : null
                : null;

              return (
                <Pressable
                  key={m.id}
                  testID={`match-card-${m.id}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/(app)/match/${m.id}`);
                  }}
                  style={({ pressed }) => [
                    styles.matchCard,
                    pressed && styles.matchCardPressed,
                    won === true && styles.matchCardWin,
                    won === false && styles.matchCardLoss,
                  ]}
                >
                  {/* Left team */}
                  <View style={styles.matchTeam}>
                    <Text
                      style={[
                        styles.matchPlayer,
                        userInTeamA && styles.matchPlayerHighlight,
                      ]}
                      numberOfLines={1}
                    >
                      {pName(m.player1_id)}
                    </Text>
                    <Text
                      style={[
                        styles.matchPlayer,
                        userInTeamA && styles.matchPlayerHighlight,
                      ]}
                      numberOfLines={1}
                    >
                      {pName(m.player2_id)}
                    </Text>
                  </View>

                  {/* Score */}
                  <View style={styles.matchScore}>
                    {hasScore ? (
                      <>
                        <Text style={styles.matchScoreNum}>{m.team_a_score}</Text>
                        <Text style={styles.matchScoreSep}>:</Text>
                        <Text style={styles.matchScoreNum}>{m.team_b_score}</Text>
                      </>
                    ) : (
                      <Text style={styles.matchScorePending}>–</Text>
                    )}
                  </View>

                  {/* Right team */}
                  <View style={[styles.matchTeam, styles.matchTeamRight]}>
                    <Text
                      style={[
                        styles.matchPlayer,
                        userInTeamB && styles.matchPlayerHighlight,
                      ]}
                      numberOfLines={1}
                    >
                      {pName(m.player3_id)}
                    </Text>
                    <Text
                      style={[
                        styles.matchPlayer,
                        userInTeamB && styles.matchPlayerHighlight,
                      ]}
                      numberOfLines={1}
                    >
                      {pName(m.player4_id)}
                    </Text>
                  </View>

                  {/* Chevron */}
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={Colors.textMuted}
                    style={styles.matchChevron}
                  />
                </Pressable>
              );
            })}
          </Animated.View>
        ))}

        {matches.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="golf-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No matches found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing[5],
    gap: Spacing[5],
    paddingBottom: Spacing[10],
  },

  // Summary
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  // Rounds
  roundSection: {
    gap: Spacing[2],
  },
  roundTitle: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.opticYellow,
    letterSpacing: 1.5,
    marginBottom: Spacing[1],
  },

  // Match card
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  matchCardPressed: {
    opacity: 0.7,
  },
  matchCardWin: {
    borderColor: Alpha.aqua20,
  },
  matchCardLoss: {
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  matchTeam: {
    flex: 1,
    gap: 2,
  },
  matchTeamRight: {
    alignItems: 'flex-end',
  },
  matchPlayer: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  matchPlayerHighlight: {
    color: Colors.opticYellow,
    fontFamily: Fonts.bodySemiBold,
  },
  matchScore: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    gap: 4,
  },
  matchScoreNum: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  matchScoreSep: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  matchScorePending: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textMuted,
  },
  matchChevron: {
    marginLeft: Spacing[2],
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[10],
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
});
