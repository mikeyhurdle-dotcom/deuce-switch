import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';
import { useAuth } from '../../../../src/providers/AuthProvider';
import { useTournament } from '../../../../src/hooks/useTournament';
import { Colors, Fonts, Shadows } from '../../../../src/lib/constants';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { ShareCard } from '../../../../src/components/ShareCard';
import { PlayerShareCard } from '../../../../src/components/PlayerShareCard';
import { shareResultsCard, sharePlayerCard } from '../../../../src/services/share-service';

export default function Results() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, refreshProfile } = useAuth();
  const { tournament, standings, loading, refetch } = useTournament(id ?? null);
  const shareRef = useRef<ViewShot | null>(null);
  const playerShareRef = useRef<ViewShot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Find current player's standing for the personal share card
  const myStanding = useMemo(() => {
    if (!user?.id || standings.length === 0) return null;
    const idx = standings.findIndex((s) => s.playerId === user.id);
    if (idx === -1) return null;
    return { ...standings[idx], rank: idx + 1 };
  }, [user?.id, standings]);

  // Sync profile stats (matches_played, matches_won) after tournament completes.
  // The DB trigger populates these when matches are approved during endTournament().
  useEffect(() => {
    if (tournament?.status === 'completed') {
      refreshProfile();
    }
  }, [tournament?.status]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (loading || !tournament) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.opticYellow} />
          <Text style={styles.loadingText}>Loading results…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const winner = standings[0] ?? null;

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Results' }} />
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
          {/* Winner Banner — animated entrance */}
          {winner && (
            <Animated.View entering={FadeInDown.duration(600).delay(200)}>
              <Card variant="glow">
                <View style={styles.winnerCard}>
                  <Text style={styles.trophy}>🏆</Text>
                  <Text style={styles.winnerLabel}>CHAMPION</Text>
                  <Text style={styles.winnerName}>{winner.displayName}</Text>
                  <Text style={styles.winnerPoints}>
                    {winner.pointsFor} points
                  </Text>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Full Standings — staggered entrance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FINAL STANDINGS</Text>
            {standings.map((entry, i) => {
              const isMe = entry.playerId === user?.id;
              const medalStyle =
                i === 0 ? styles.goldRow : i === 1 ? styles.silverRow : i === 2 ? styles.bronzeRow : undefined;
              return (
                <Animated.View
                  key={entry.playerId}
                  entering={FadeInUp.duration(400).delay(400 + i * 80)}
                >
                  <View
                    style={[styles.row, isMe && styles.myRow, medalStyle]}
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
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>
                        {entry.displayName}
                        {isMe ? ' (You)' : ''}
                      </Text>
                      <Text style={styles.playerStats}>
                        {entry.wins}W / {entry.matchesPlayed}P · {entry.draws}D ·{' '}
                        {Math.round(entry.winRate * 100)}%
                      </Text>
                    </View>
                    <Text style={styles.playerPoints}>{entry.pointsFor}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          <Animated.View entering={FadeInUp.duration(400).delay(800)} style={styles.actions}>
            {myStanding && (
              <Button
                title="SHARE MY RESULT"
                onPress={() => sharePlayerCard(playerShareRef)}
                variant="primary"
                size="lg"
              />
            )}
            <Button
              title="SHARE ALL RESULTS"
              onPress={() => shareResultsCard(shareRef)}
              variant="outline"
              size="lg"
            />
            <Button
              title="BACK TO HOME"
              onPress={() => router.replace('/(app)/(tabs)/home')}
              variant="ghost"
              size="lg"
            />
          </Animated.View>
        </ScrollView>

        {/* Off-screen cards for capture */}
        <View style={styles.offscreen}>
          {/* Full tournament results card */}
          <ViewShot
            ref={shareRef}
            options={{ format: 'png', quality: 1 }}
          >
            <ShareCard
              tournamentName={tournament.name}
              tournamentFormat={tournament.tournament_format}
              createdAt={tournament.created_at}
              standings={standings}
            />
          </ViewShot>

          {/* Personal player share card */}
          {myStanding && (
            <ViewShot
              ref={playerShareRef}
              options={{ format: 'png', quality: 1 }}
            >
              <PlayerShareCard
                playerName={myStanding.displayName}
                rank={myStanding.rank}
                totalPlayers={standings.length}
                totalPoints={myStanding.pointsFor}
                matchesPlayed={myStanding.matchesPlayed}
                matchesWon={myStanding.wins}
                winRate={myStanding.winRate}
                tournamentName={tournament.name}
                tournamentFormat={tournament.tournament_format}
                tournamentDate={tournament.created_at}
              />
            </ViewShot>
          )}
        </View>
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
    gap: 24,
  },
  winnerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    ...Shadows.glowYellow,
  },
  trophy: { fontSize: 56 },
  winnerLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 3,
  },
  winnerName: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    color: Colors.opticYellow,
  },
  winnerPoints: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    color: Colors.textDim,
  },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  myRow: {
    borderWidth: 1,
    borderColor: Colors.opticYellow,
  },
  rank: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.textDim,
    width: 28,
    textAlign: 'center',
  },
  gold: { color: Colors.gold },
  silver: { color: Colors.silver },
  bronze: { color: Colors.bronze },
  goldRow: {
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  silverRow: {
    borderWidth: 1,
    borderColor: Colors.silver,
  },
  bronzeRow: {
    borderWidth: 1,
    borderColor: Colors.bronze,
  },
  playerInfo: { flex: 1, gap: 2 },
  playerName: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  playerStats: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  playerPoints: {
    fontFamily: Fonts.mono,
    fontSize: 20,
    color: Colors.opticYellow,
  },
  actions: {
    gap: 12,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
});
