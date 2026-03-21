import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../../src/providers/AuthProvider';
import { useTournament } from '../../../../src/hooks/useTournament';
import { useTournamentNotifications } from '../../../../src/hooks/useNotifications';
import { startTournament, addGuestPlayer } from '../../../../src/services/tournament-service';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../../../../src/lib/constants';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { Badge } from '../../../../src/components/ui/Badge';
import { TournamentQR } from '../../../../src/components/TournamentQR';
import { AnimatedPressable, useSpringPress } from '../../../../src/hooks/useSpringPress';

const ROW_STAGGER = 60; // ms between each player row animation

// ── Animated Player Row ──────────────────────────────────────────────────────
function PlayerRow({
  displayName,
  index,
  isHost,
}: {
  displayName: string;
  index: number;
  isHost: boolean;
}) {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = 150 + index * ROW_STAGGER;
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.playerRow, animStyle]}
      accessible
      accessibilityLabel={`Player ${index + 1}: ${displayName}${isHost ? ', host' : ''}`}
    >
      <View style={styles.playerNumber}>
        <Text style={styles.playerNumText}>{index + 1}</Text>
      </View>
      <Text style={styles.playerName}>{displayName}</Text>
      {isHost && <Badge label="Host" variant="info" />}
    </Animated.View>
  );
}

// ── Import Players Button (spring press) ─────────────────────────────────────
function ImportPlayersButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();
  return (
    <AnimatedPressable
      style={[styles.importButton, animatedStyle]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Import players from screenshot"
    >
      <Ionicons name="camera-outline" size={20} color={Colors.aquaGreen} />
      <Text style={styles.importButtonText}>Import Players from Screenshot</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
    </AnimatedPressable>
  );
}

export default function Lobby() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { tournament, players, loading, refetch } = useTournament(id ?? null);
  useTournamentNotifications({ tournament });
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

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

  const handleAddPlayer = async () => {
    const name = guestName.trim();
    if (!name || !id) return;
    setAddingPlayer(true);
    try {
      await addGuestPlayer(id, name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGuestName('');
      setShowAddPlayer(false);
      await refetch();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message ?? 'Failed to add player');
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleStart = async () => {
    if (!id) return;
    if (players.length < 4) {
      Alert.alert('Not enough players', 'You need at least 4 players to start.');
      return;
    }

    Alert.alert(
      'Start Tournament?',
      `${players.length} players are in the lobby. Once started, new players won't be able to join.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          style: 'default',
          onPress: async () => {
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
          },
        },
      ],
    );
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
              <PlayerRow
                key={p.playerId}
                displayName={p.displayName}
                index={i}
                isHost={p.playerId === tournament.organizer_id}
              />
            ))}

            {players.length < 4 && (
              <Text style={styles.waitingText}>
                Waiting for {4 - players.length} more player
                {4 - players.length > 1 ? 's' : ''}…
              </Text>
            )}
          </View>

          {/* Add Player — Organiser Only */}
          {isOrganiser && !showAddPlayer && (
            <Pressable
              style={styles.addPlayerButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAddPlayer(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Add player manually"
            >
              <Ionicons name="person-add-outline" size={20} color={Colors.opticYellow} />
              <Text style={styles.addPlayerButtonText}>Add Player</Text>
            </Pressable>
          )}

          {/* Add Player Inline Form */}
          {isOrganiser && showAddPlayer && (
            <View style={styles.addPlayerForm}>
              <TextInput
                style={styles.addPlayerInput}
                placeholder="Player name"
                placeholderTextColor={Colors.textMuted}
                value={guestName}
                onChangeText={setGuestName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddPlayer}
              />
              <View style={styles.addPlayerActions}>
                <Pressable
                  style={styles.addPlayerCancel}
                  onPress={() => {
                    setShowAddPlayer(false);
                    setGuestName('');
                  }}
                >
                  <Text style={styles.addPlayerCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.addPlayerConfirm, !guestName.trim() && { opacity: 0.4 }]}
                  onPress={handleAddPlayer}
                  disabled={!guestName.trim() || addingPlayer}
                >
                  {addingPlayer ? (
                    <ActivityIndicator size="small" color={Colors.darkBg} />
                  ) : (
                    <Text style={styles.addPlayerConfirmText}>Add</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* Import Players — Organiser Only */}
          {isOrganiser && (
            <ImportPlayersButton
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/(app)/import-matches',
                  params: { tournamentId: id },
                });
              }}
            />
          )}

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
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[4],
  },
  importButtonText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.aquaGreen,
  },
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.opticYellow,
    borderStyle: 'dashed',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[4],
  },
  addPlayerButtonText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.opticYellow,
  },
  addPlayerForm: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  addPlayerInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing[4],
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  addPlayerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing[3],
  },
  addPlayerCancel: {
    paddingVertical: 10,
    paddingHorizontal: Spacing[4],
  },
  addPlayerCancelText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
  },
  addPlayerConfirm: {
    backgroundColor: Colors.opticYellow,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  addPlayerConfirmText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.darkBg,
  },
});
