import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../../src/providers/AuthProvider';
import { useTournament } from '../../../../src/hooks/useTournament';
import { useTournamentNotifications } from '../../../../src/hooks/useNotifications';
import { startTournament } from '../../../../src/services/tournament-service';
import { Colors, Fonts } from '../../../../src/lib/constants';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { Badge } from '../../../../src/components/ui/Badge';
import { TournamentQR } from '../../../../src/components/TournamentQR';

export default function Lobby() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { tournament, players, loading, refetch } = useTournament(id ?? null);
  useTournamentNotifications({ tournament });
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const isOrganiser = tournament?.organizer_id === user?.id;

  // Auto-navigate when tournament starts
  useEffect(() => {
    if (tournament?.status === 'running') {
      router.replace(`/(app)/tournament/${id}/play`);
    }
  }, [tournament?.status]);

  const handleStart = async () => {
    if (!id) return;
    if (players.length < 4) {
      Alert.alert('Not enough players', 'You need at least 4 players to start.');
      return;
    }

    setStarting(true);
    try {
      await startTournament(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message ?? 'Failed to start tournament');
    } finally {
      setStarting(false);
    }
  };

  if (loading || !tournament) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.opticYellow} />
          <Text style={styles.loadingText}>Loading lobby…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: tournament.name }} />
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
          {/* Join Code */}
          <Card variant="highlighted">
            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>JOIN CODE</Text>
              <Text style={styles.codeValue}>{tournament.join_code ?? '—'}</Text>
              <Text style={styles.codeHint}>
                Share this code with players to join
              </Text>
            </View>
          </Card>

          {/* QR Code for sharing */}
          {tournament.id && (
            <TournamentQR
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              joinCode={tournament.join_code}
            />
          )}

          {/* Player List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PLAYERS</Text>
              <Badge
                label={`${players.length}${tournament.max_players ? ` / ${tournament.max_players}` : ''}`}
                variant={players.length >= 4 ? 'success' : 'default'}
              />
            </View>

            {players.map((p, i) => (
              <View key={p.playerId} style={styles.playerRow}>
                <View style={styles.playerNumber}>
                  <Text style={styles.playerNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.playerName}>{p.displayName}</Text>
                {p.playerId === tournament.organizer_id && (
                  <Badge label="Host" variant="info" />
                )}
              </View>
            ))}

            {players.length < 4 && (
              <Text style={styles.waitingText}>
                Waiting for {4 - players.length} more player
                {4 - players.length > 1 ? 's' : ''}…
              </Text>
            )}
          </View>

          {/* Organiser Controls */}
          {isOrganiser && (
            <Button
              title="START TOURNAMENT"
              onPress={handleStart}
              loading={starting}
              disabled={players.length < 4}
              variant="primary"
              size="lg"
            />
          )}

          {!isOrganiser && (
            <View style={styles.waitBanner}>
              <Text style={styles.waitText}>
                Waiting for the organiser to start…
              </Text>
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
    gap: 24,
  },
  codeSection: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  codeLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  codeValue: {
    fontFamily: Fonts.mono,
    fontSize: 48,
    color: Colors.opticYellow,
    letterSpacing: 12,
  },
  codeHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
  },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  playerNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNumText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
  },
  playerName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  waitingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  waitBanner: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  waitText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
  },
});
