import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../../src/providers/AuthProvider';
import { useTournament } from '../../../../src/hooks/useTournament';
import { Colors, Fonts } from '../../../../src/lib/constants';
import { Card } from '../../../../src/components/ui/Card';

export default function Leaderboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { tournament, standings, loading, refetch } = useTournament(id ?? null);
  const [refreshing, setRefreshing] = useState(false);

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
      <Stack.Screen options={{ headerTitle: 'Leaderboard' }} />
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
          <Text style={styles.title}>{tournament?.name ?? 'Tournament'}</Text>

          {standings.length === 0 ? (
            <Card>
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  No scores reported yet. The leaderboard will update in
                  real-time.
                </Text>
              </View>
            </Card>
          ) : (
            <View style={styles.list}>
              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={[styles.headerText, styles.rankCol]}>#</Text>
                <Text style={[styles.headerText, styles.nameCol]}>PLAYER</Text>
                <Text style={[styles.headerText, styles.statCol]}>PTS</Text>
                <Text style={[styles.headerText, styles.statCol]}>W</Text>
                <Text style={[styles.headerText, styles.statCol]}>P</Text>
              </View>

              {standings.map((entry, i) => {
                const isMe = entry.playerId === user?.id;
                const medalColor =
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
                      medalColor != null && {
                        borderLeftWidth: 3,
                        borderLeftColor: medalColor,
                      },
                      isMe && styles.myRow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rank,
                        styles.rankCol,
                        i === 0 && styles.goldText,
                        i === 1 && styles.silverText,
                        i === 2 && styles.bronzeText,
                      ]}
                    >
                      {i + 1}
                    </Text>
                    <Text
                      style={[styles.name, styles.nameCol]}
                      numberOfLines={1}
                    >
                      {entry.displayName}
                      {isMe ? ' (You)' : ''}
                    </Text>
                    <Text style={[styles.points, styles.statCol]}>
                      {entry.pointsFor}
                    </Text>
                    <Text style={[styles.stat, styles.statCol]}>
                      {entry.wins}
                    </Text>
                    <Text style={[styles.stat, styles.statCol]}>
                      {entry.matchesPlayed}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.textDim },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
  },
  list: { gap: 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  myRow: {
    borderWidth: 1,
    borderColor: Colors.opticYellow,
  },
  rankCol: { width: 30 },
  nameCol: { flex: 1 },
  statCol: { width: 40, textAlign: 'center' },
  rank: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    color: Colors.textDim,
  },
  name: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  points: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    color: Colors.opticYellow,
  },
  stat: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.textDim,
  },
  goldText: { color: Colors.gold },
  silverText: { color: Colors.silver },
  bronzeText: { color: Colors.bronze },
});
