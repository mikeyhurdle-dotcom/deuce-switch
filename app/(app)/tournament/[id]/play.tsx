import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../../src/providers/AuthProvider';
import { useTournament } from '../../../../src/hooks/useTournament';
import { useTournamentClock } from '../../../../src/hooks/useTournamentClock';
import { useTournamentNotifications } from '../../../../src/hooks/useNotifications';
import { submitScore } from '../../../../src/services/tournament-service';
import { enqueueScore, flushQueue, pendingCount } from '../../../../src/services/offline-queue';
import { notifyClockExpired } from '../../../../src/services/notification-service';
import { Colors, Fonts, Radius } from '../../../../src/lib/constants';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { Input } from '../../../../src/components/ui/Input';
import { ClockDisplay } from '../../../../src/components/ClockDisplay';

export default function Play() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { tournament, currentRoundMatches, players, loading, refetch } = useTournament(
    id ?? null,
  );
  const clock = useTournamentClock(tournament);
  useTournamentNotifications({ tournament });
  const [scoreInput, setScoreInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const clockExpiredRef = useRef(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const isOrganiser = tournament?.organizer_id === user?.id;

  // Flush any queued offline scores on mount
  useEffect(() => {
    flushQueue();
  }, []);

  // Clock expiry — haptic + notification (fires once per expiry)
  useEffect(() => {
    if (clock.isExpired && !clockExpiredRef.current) {
      clockExpiredRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      notifyClockExpired();
    }
    // Reset when clock starts running again (new round)
    if (clock.isRunning && clockExpiredRef.current) {
      clockExpiredRef.current = false;
    }
  }, [clock.isExpired, clock.isRunning]);

  // Auto-navigate to results when tournament completes
  useEffect(() => {
    if (tournament?.status === 'completed') {
      router.replace(`/(app)/tournament/${id}/results`);
    }
  }, [tournament?.status]);

  // Find this player's match in the current round
  const currentMatch = useMemo(() => {
    if (!user) return null;
    return (
      currentRoundMatches.find(
        (m) =>
          m.player1_id === user.id ||
          m.player2_id === user.id ||
          m.player3_id === user.id ||
          m.player4_id === user.id,
      ) ?? null
    );
  }, [currentRoundMatches, user]);

  // Determine which team the user is on and resolve player names
  const matchInfo = useMemo(() => {
    if (!currentMatch || !user) return null;

    const playerMap = new Map(players.map((p) => [p.playerId, p.displayName]));
    const getName = (pid: string) => playerMap.get(pid) ?? 'Player';

    const isTeamA =
      currentMatch.player1_id === user.id ||
      currentMatch.player2_id === user.id;

    const teamANames = [currentMatch.player1_id, currentMatch.player2_id]
      .filter(Boolean)
      .map(getName);
    const teamBNames = [currentMatch.player3_id, currentMatch.player4_id]
      .filter(Boolean)
      .map(getName);

    return {
      isTeamA,
      myTeamLabel: isTeamA ? 'TEAM A' : 'TEAM B',
      opponentTeamLabel: isTeamA ? 'TEAM B' : 'TEAM A',
      myTeamNames: isTeamA ? teamANames : teamBNames,
      opponentNames: isTeamA ? teamBNames : teamANames,
    };
  }, [currentMatch, user, players]);

  // Reset score input when round changes
  useEffect(() => {
    if (currentMatch?.team_a_score != null) {
      // Score already submitted — show it
      if (matchInfo?.isTeamA) {
        setScoreInput(String(currentMatch.team_a_score));
      } else {
        setScoreInput(String(currentMatch.team_b_score));
      }
    } else {
      setScoreInput('');
    }
  }, [currentMatch?.id, currentMatch?.team_a_score]);

  // Live-validated parsed score + opponent auto-calc
  const scoreValidation = useMemo(() => {
    if (!tournament) return { parsed: NaN, opponent: NaN, error: '', isValid: false };
    const trimmed = scoreInput.trim();
    if (!trimmed) return { parsed: NaN, opponent: NaN, error: '', isValid: false };
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed)) return { parsed, opponent: NaN, error: 'Enter a number', isValid: false };
    if (parsed < 0) return { parsed, opponent: NaN, error: 'Score can\u2019t be negative', isValid: false };
    if (parsed > tournament.points_per_match) {
      return { parsed, opponent: NaN, error: `Max score is ${tournament.points_per_match}`, isValid: false };
    }
    const opponent = tournament.points_per_match - parsed;
    return { parsed, opponent, error: '', isValid: true };
  }, [scoreInput, tournament]);

  const handleSubmitScore = async () => {
    if (!currentMatch || !tournament || !matchInfo) return;
    if (!scoreValidation.isValid) return;

    const score = scoreValidation.parsed;
    const opponentScore = scoreValidation.opponent;

    setSubmitting(true);
    try {

      // Always store as team_a_score / team_b_score
      const teamAScore = matchInfo.isTeamA ? score : opponentScore;
      const teamBScore = matchInfo.isTeamA ? opponentScore : score;

      try {
        await submitScore(currentMatch.id, teamAScore, teamBScore);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Score submitted', `${score} – ${opponentScore}`);
      } catch {
        // Network failure — queue for later
        await enqueueScore(currentMatch.id, teamAScore, teamBScore);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Saved offline',
          'Score queued and will be submitted when you reconnect.',
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !tournament) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.opticYellow} />
          <Text style={styles.loadingText}>Loading match…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scoreLocked =
    currentMatch?.status === 'reported' ||
    currentMatch?.status === 'approved';

  return (
    <>
      <Stack.Screen
        options={{ headerTitle: `Round ${tournament.current_round ?? 1}` }}
      />
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
          {/* Clock + Round Header */}
          <View style={styles.roundHeader}>
            <ClockDisplay
              formattedTime={clock.formattedTime}
              isRunning={clock.isRunning}
              isExpired={clock.isExpired}
              size="md"
            />
            <Text style={styles.tournamentName}>{tournament.name}</Text>
          </View>

          {/* Current Match */}
          {currentMatch && matchInfo ? (
            <Card variant="highlighted">
              <View style={styles.matchCard}>
                <Text style={styles.courtLabel}>
                  COURT {currentMatch.court_number ?? '—'}
                </Text>

                <View style={styles.teams}>
                  <View style={styles.team}>
                    <Text style={styles.teamLabel}>{matchInfo.myTeamLabel}</Text>
                    <Text style={styles.teamPlayers}>
                      {matchInfo.myTeamNames.join(' & ')}
                    </Text>
                  </View>
                  <Text style={styles.vs}>VS</Text>
                  <View style={styles.team}>
                    <Text style={styles.teamLabel}>
                      {matchInfo.opponentTeamLabel}
                    </Text>
                    <Text style={styles.teamPlayers}>
                      {matchInfo.opponentNames.join(' & ')}
                    </Text>
                  </View>
                </View>

                {/* Score Entry or Locked Display */}
                {scoreLocked ? (
                  <View style={styles.scoreDisplay}>
                    <Text style={styles.scoreValue}>
                      {currentMatch.team_a_score} – {currentMatch.team_b_score}
                    </Text>
                    <Text
                      style={[
                        styles.scoreLocked,
                        currentMatch.status === 'approved' &&
                          styles.scoreApproved,
                      ]}
                    >
                      {currentMatch.status === 'approved'
                        ? 'Score approved ✓'
                        : 'Score submitted — awaiting approval'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.scoreEntry}>
                    <Text style={styles.scoreLabel}>YOUR TEAM'S SCORE</Text>
                    <Input
                      label=""
                      placeholder="0"
                      value={scoreInput}
                      onChangeText={setScoreInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      style={styles.scoreInput}
                      error={scoreValidation.error}
                    />

                    {/* Live scoreline preview */}
                    {scoreValidation.isValid && (
                      <View style={styles.scorePreview}>
                        <View style={styles.scorePreviewTeam}>
                          <Text style={styles.scorePreviewLabel}>YOU</Text>
                          <Text style={styles.scorePreviewValue}>
                            {scoreValidation.parsed}
                          </Text>
                        </View>
                        <Text style={styles.scorePreviewDash}>–</Text>
                        <View style={styles.scorePreviewTeam}>
                          <Text style={styles.scorePreviewLabel}>OPP</Text>
                          <Text style={styles.scorePreviewValueOpp}>
                            {scoreValidation.opponent}
                          </Text>
                        </View>
                      </View>
                    )}

                    <Button
                      title="SUBMIT SCORE"
                      onPress={handleSubmitScore}
                      loading={submitting}
                      disabled={!scoreValidation.isValid}
                      variant="primary"
                      size="lg"
                    />
                  </View>
                )}
              </View>
            </Card>
          ) : (
            <Card>
              <View style={styles.noMatch}>
                <Text style={styles.noMatchText}>
                  No match assigned this round. You have a bye.
                </Text>
              </View>
            </Card>
          )}

          {/* Quick Nav */}
          <View style={styles.navRow}>
            <Button
              title="LEADERBOARD"
              onPress={() => router.push(`/(app)/tournament/${id}/leaderboard`)}
              variant="outline"
              size="md"
            />
            <Button
              title="FEED"
              onPress={() => router.push(`/(app)/tournament/${id}/feed`)}
              variant="outline"
              size="md"
            />
            {isOrganiser && (
              <Button
                title="DASHBOARD"
                onPress={() =>
                  router.push(`/(app)/tournament/${id}/organiser`)
                }
                variant="secondary"
                size="md"
              />
            )}
          </View>
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
  roundHeader: { alignItems: 'center', gap: 8 },
  tournamentName: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
  },
  matchCard: { gap: 20, paddingVertical: 8 },
  courtLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
    textAlign: 'center',
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  team: { alignItems: 'center', gap: 4, flex: 1 },
  teamLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  teamPlayers: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  vs: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.textMuted,
  },
  scoreEntry: { gap: 12, alignItems: 'center' },
  scoreLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  scoreInput: {
    fontFamily: Fonts.mono,
    fontSize: 36,
    textAlign: 'center',
  },
  scorePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scorePreviewTeam: {
    alignItems: 'center',
    gap: 2,
  },
  scorePreviewLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  scorePreviewValue: {
    fontFamily: Fonts.mono,
    fontSize: 28,
    color: Colors.opticYellow,
  },
  scorePreviewDash: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: Colors.textMuted,
  },
  scorePreviewValueOpp: {
    fontFamily: Fonts.mono,
    fontSize: 28,
    color: Colors.aquaGreen,
  },
  scoreDisplay: { alignItems: 'center', gap: 4 },
  scoreValue: {
    fontFamily: Fonts.mono,
    fontSize: 36,
    color: Colors.opticYellow,
  },
  scoreLocked: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  scoreApproved: {
    color: Colors.success,
  },
  noMatch: { padding: 24, alignItems: 'center' },
  noMatchText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
    textAlign: 'center',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
});
