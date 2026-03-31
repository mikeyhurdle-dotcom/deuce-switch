import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../src/providers/AuthProvider';
import { useTournament } from '../../../../src/hooks/useTournament';
import { useTournamentClock } from '../../../../src/hooks/useTournamentClock';
import { useTournamentNotifications } from '../../../../src/hooks/useNotifications';
import {
  submitScore,
  advanceRound,
  endTournament,
  startClock,
  pauseClock,
  resetClock,
  type ScoreMetadata,
} from '../../../../src/services/tournament-service';
import { enqueueScore, flushQueue, pendingCount } from '../../../../src/services/offline-queue';
import { notifyClockExpired } from '../../../../src/services/notification-service';
import { Colors, Fonts, Radius, Spacing } from '../../../../src/lib/constants';
import type { MatchConditions, CourtSide, MatchIntensity } from '../../../../src/lib/types';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { Badge } from '../../../../src/components/ui/Badge';
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

  // Match metadata (captured alongside score)
  const [conditions, setConditions] = useState<MatchConditions | null>(null);
  const [courtSide, setCourtSide] = useState<CourtSide | null>(null);
  const [intensity, setIntensity] = useState<MatchIntensity | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const isOrganiser = tournament?.organizer_id === user?.id;
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [hostScoreMatchId, setHostScoreMatchId] = useState<string | null>(null);
  const [hostScoreA, setHostScoreA] = useState('');
  const [hostScoreB, setHostScoreB] = useState('');
  const [hostSubmitting, setHostSubmitting] = useState(false);

  // Organiser: round scores summary
  const scoredCount = currentRoundMatches.filter(
    (m) => m.status === 'reported' || m.status === 'approved',
  ).length;
  const allScoresIn = currentRoundMatches.length > 0 && scoredCount === currentRoundMatches.length;

  // Organiser: player name lookup for round scores
  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.playerId, p.displayName])),
    [players],
  );
  const pName = (pid: string | null) => (pid ? playerMap.get(pid) ?? '?' : '');

  // ── Organiser Handlers ──
  const handleClockToggle = async () => {
    if (!id || !tournament) return;
    setActionLoading('clock');
    try {
      if (tournament.master_clock_running) {
        await pauseClock(id);
      } else {
        await startClock(id);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetClock = async () => {
    if (!id) return;
    setActionLoading('reset');
    try {
      await resetClock(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdvanceRound = () => {
    if (!id || !tournament) return;
    const nextRound = (tournament.current_round ?? 1) + 1;
    Alert.alert('Advance Round', `Move to round ${nextRound}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Advance',
        onPress: async () => {
          setActionLoading('advance');
          try {
            await advanceRound(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e: any) {
            if (e.message?.includes('No more rounds')) {
              Alert.alert('Last Round', 'All rounds are complete. End the tournament?', [
                { text: 'Not yet', style: 'cancel' },
                { text: 'End Tournament', style: 'destructive', onPress: () => handleEndTournament(true) },
              ]);
            } else {
              Alert.alert('Error', e.message);
            }
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleEndTournament = async (skipConfirm = false) => {
    if (!id) return;
    const doEnd = async () => {
      setActionLoading('end');
      try {
        await endTournament(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/(app)/tournament/${id}/results`);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setActionLoading(null);
      }
    };
    if (skipConfirm) { await doEnd(); return; }
    Alert.alert('End Tournament?', 'This will finalise all scores and close the tournament.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: doEnd },
    ]);
  };

  // Host: open score input for a specific match
  const handleHostScoreTap = (matchId: string, existingA: number | null, existingB: number | null) => {
    setHostScoreMatchId(matchId);
    setHostScoreA(existingA != null ? String(existingA) : '');
    setHostScoreB(existingB != null ? String(existingB) : '');
  };

  // Host: submit/override score for any match
  const handleHostScoreSubmit = async () => {
    if (!hostScoreMatchId || !tournament) return;
    const a = parseInt(hostScoreA, 10);
    const b = parseInt(hostScoreB, 10);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      Alert.alert('Invalid score', 'Enter valid scores for both teams.');
      return;
    }
    if (a + b !== tournament.points_per_match) {
      Alert.alert('Invalid total', `Scores must add up to ${tournament.points_per_match}.`);
      return;
    }
    setHostSubmitting(true);
    try {
      await submitScore(hostScoreMatchId, a, b, {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHostScoreMatchId(null);
      await refetch();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to submit score');
    } finally {
      setHostSubmitting(false);
    }
  };

  // Refetch data when screen regains focus (e.g. returning from leaderboard)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

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
    if (submitting) return; // debounce — prevent double-tap

    const score = scoreValidation.parsed;
    const opponentScore = scoreValidation.opponent;

    setSubmitting(true);
    try {

      // Always store as team_a_score / team_b_score
      const teamAScore = matchInfo.isTeamA ? score : opponentScore;
      const teamBScore = matchInfo.isTeamA ? opponentScore : score;
      const metadata: ScoreMetadata = {
        conditions,
        court_side: courtSide,
        intensity,
      };

      try {
        await submitScore(currentMatch.id, teamAScore, teamBScore, metadata);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Score submitted', `${score} – ${opponentScore}`);
      } catch (err: unknown) {
        // Only queue for offline/network errors, not validation/permission errors
        const message = err instanceof Error ? err.message : String(err);
        const isNetworkError =
          message.includes('network') ||
          message.includes('fetch') ||
          message.includes('timeout') ||
          message.includes('Failed to fetch') ||
          message.includes('Network request failed');

        if (isNetworkError) {
          await enqueueScore(currentMatch.id, teamAScore, teamBScore, metadata);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            'Saved offline',
            'Score queued and will be submitted when you reconnect.',
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Submission failed', message);
        }
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
        <View testID="state-play-loading" style={styles.center}>
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
      <SafeAreaView testID="screen-tournament-play" style={styles.safe} edges={['bottom']}>
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
          <Animated.View entering={FadeIn.duration(400)} style={styles.roundHeader}>
            <ClockDisplay
              formattedTime={clock.formattedTime}
              isRunning={clock.isRunning}
              isExpired={clock.isExpired}
              size="md"
            />
            <Text style={styles.tournamentName}>{tournament.name}</Text>
          </Animated.View>

          {/* Current Match */}
          {currentMatch && matchInfo ? (
            <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
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

                    {/* Match metadata — optional quick-tag chips */}
                    <View style={styles.metaSection}>
                      <Text style={styles.metaLabel}>MATCH DETAILS (optional)</Text>

                      {/* Conditions */}
                      <View style={styles.metaRow}>
                        {(['indoor', 'outdoor'] as const).map((c) => (
                          <Pressable
                            key={c}
                            style={[styles.metaChip, conditions === c && styles.metaChipActive]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setConditions(conditions === c ? null : c);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: conditions === c }}
                            accessibilityLabel={c}
                          >
                            <Text style={[styles.metaChipText, conditions === c && styles.metaChipTextActive]}>
                              {c === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {/* Court Side */}
                      <View style={styles.metaRow}>
                        {(['left', 'right'] as const).map((s) => (
                          <Pressable
                            key={s}
                            style={[styles.metaChip, courtSide === s && styles.metaChipActive]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setCourtSide(courtSide === s ? null : s);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: courtSide === s }}
                            accessibilityLabel={`${s} side`}
                          >
                            <Text style={[styles.metaChipText, courtSide === s && styles.metaChipTextActive]}>
                              {s === 'left' ? '⬅️ Left' : '➡️ Right'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {/* Intensity */}
                      <View style={styles.metaRow}>
                        {(['casual', 'competitive', 'intense'] as const).map((v) => (
                          <Pressable
                            key={v}
                            style={[styles.metaChip, intensity === v && styles.metaChipActive]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setIntensity(intensity === v ? null : v);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: intensity === v }}
                            accessibilityLabel={v}
                          >
                            <Text style={[styles.metaChipText, intensity === v && styles.metaChipTextActive]}>
                              {v === 'casual' ? '😌' : v === 'competitive' ? '💪' : '🔥'} {v.charAt(0).toUpperCase() + v.slice(1)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <Button
                      title="SUBMIT SCORE"
                      onPress={handleSubmitScore}
                      loading={submitting}
                      disabled={!scoreValidation.isValid}
                      variant="primary"
                      size="lg"
                      testID="btn-submit-score"
                    />
                  </View>
                )}
              </View>
            </Card>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
            <Card>
              <View style={styles.noMatch}>
                <Text style={styles.noMatchText}>
                  {isOrganiser && !players.some((p) => p.playerId === user?.id)
                    ? 'You are hosting this tournament. Use the controls below to manage rounds.'
                    : 'No match assigned this round. You have a bye.'}
                </Text>
              </View>
            </Card>
            </Animated.View>
          )}

          {/* ── Organiser Controls Panel ── */}
          {isOrganiser && (
            <Animated.View entering={FadeInDown.delay(250).duration(400).springify()}>
              {/* Round Scores Tracker */}
              <Card>
                <View style={styles.orgSection}>
                  <View style={styles.orgHeader}>
                    <Text style={styles.orgTitle}>ROUND SCORES</Text>
                    <Badge
                      label={`${scoredCount}/${currentRoundMatches.length} IN`}
                      variant={allScoresIn ? 'success' : 'warning'}
                    />
                  </View>
                  {currentRoundMatches.map((m) => {
                    const teamA = [pName(m.player1_id), pName(m.player2_id)].filter(Boolean).join(' & ');
                    const teamB = [pName(m.player3_id), pName(m.player4_id)].filter(Boolean).join(' & ');
                    const hasScore = m.team_a_score != null;
                    const isEditing = hostScoreMatchId === m.id;
                    return (
                      <View key={m.id}>
                        <Pressable
                          style={[styles.miniMatch, isEditing && { backgroundColor: Colors.surface }]}
                          onPress={() => handleHostScoreTap(m.id, m.team_a_score, m.team_b_score)}
                        >
                          <Text style={styles.miniCourt}>C{m.court_number ?? '?'}</Text>
                          <Text style={styles.miniTeams} numberOfLines={1}>
                            {teamA} vs {teamB}
                          </Text>
                          {hasScore ? (
                            <Text style={styles.miniScore}>{m.team_a_score}-{m.team_b_score}</Text>
                          ) : (
                            <Text style={styles.miniPending}>tap to score</Text>
                          )}
                        </Pressable>
                        {isEditing && (
                          <View style={styles.hostScoreRow}>
                            <View style={styles.hostScoreInputWrap}>
                              <Text style={styles.hostScoreLabel}>A</Text>
                              <Input label="" placeholder="0" value={hostScoreA} onChangeText={setHostScoreA} keyboardType="number-pad" maxLength={2} style={styles.hostScoreInput} testID="input-score-a" />
                            </View>
                            <Text style={styles.hostScoreDash}>–</Text>
                            <View style={styles.hostScoreInputWrap}>
                              <Text style={styles.hostScoreLabel}>B</Text>
                              <Input label="" placeholder="0" value={hostScoreB} onChangeText={setHostScoreB} keyboardType="number-pad" maxLength={2} style={styles.hostScoreInput} testID="input-score-b" />
                            </View>
                            <Button title="SET" onPress={handleHostScoreSubmit} loading={hostSubmitting} variant="primary" size="sm" testID="btn-set-score" />
                            <Pressable onPress={() => setHostScoreMatchId(null)} style={styles.hostScoreCancel}>
                              <Ionicons name="close" size={18} color={Colors.textMuted} />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Card>

              {/* Clock Controls */}
              <View style={styles.orgClockRow}>
                <Button
                  title={tournament.master_clock_running ? 'PAUSE' : 'START'}
                  onPress={handleClockToggle}
                  variant={tournament.master_clock_running ? 'outline' : 'secondary'}
                  size="md"
                  loading={actionLoading === 'clock'}
                />
                <Button
                  title="RESET"
                  onPress={handleResetClock}
                  variant="outline"
                  size="md"
                  loading={actionLoading === 'reset'}
                />
              </View>

              {/* Round Actions */}
              <Button
                title="ADVANCE ROUND"
                onPress={handleAdvanceRound}
                variant="primary"
                size="lg"
                loading={actionLoading === 'advance'}
                disabled={!allScoresIn}
                testID="btn-advance-round"
              />
              <Pressable
                testID="btn-end-tournament"
                style={styles.endButton}
                onPress={() => handleEndTournament()}
              >
                <Text style={styles.endButtonText}>End Tournament</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Quick Nav */}
          <Animated.View entering={FadeInDown.delay(350).duration(400).springify()} style={styles.navRow}>
            <Button
              title="LEADERBOARD"
              onPress={() => router.push(`/(app)/tournament/${id}/results`)}
              variant="outline"
              size="md"
            />
          </Animated.View>
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
  // Match metadata chips
  metaSection: {
    width: '100%',
    gap: Spacing[2],
    paddingTop: Spacing[1],
  },
  metaLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  metaChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  metaChipActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: 'rgba(204,255,0,0.12)',
  },
  metaChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
  },
  metaChipTextActive: {
    color: Colors.opticYellow,
  },
  // Organiser panel
  orgSection: { gap: 10 },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orgTitle: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  miniMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  miniCourt: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    width: 24,
  },
  miniTeams: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  miniScore: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.opticYellow,
  },
  miniPending: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.opticYellow,
  },
  // Host score input row
  hostScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  hostScoreInputWrap: {
    alignItems: 'center',
    gap: 2,
  },
  hostScoreLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  hostScoreInput: {
    width: 64,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: Fonts.mono,
    paddingHorizontal: 4,
  },
  hostScoreDash: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textDim,
  },
  hostScoreCancel: {
    padding: 8,
  },
  orgClockRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  endButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  endButtonText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.error,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
});
