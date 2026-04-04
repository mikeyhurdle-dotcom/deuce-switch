import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTournament } from '../../../../src/hooks/useTournament';
import { useTournamentClock } from '../../../../src/hooks/useTournamentClock';
import {
  advanceRound,
  endTournament,
  overrideScore,
  startClock,
  pauseClock,
  resetClock,
  getTotalRounds,
  toggleAnonymisePlayers,
} from '../../../../src/services/tournament-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../../../src/lib/constants';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { Badge } from '../../../../src/components/ui/Badge';
import { ClockDisplay } from '../../../../src/components/ClockDisplay';
import { TournamentQR } from '../../../../src/components/TournamentQR';
import { AnimatedPressable, useSpringPress } from '../../../../src/hooks/useSpringPress';

const ROW_STAGGER = 60; // ms between each match card / standings row

export default function OrganiserDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournament, currentRoundMatches, players, standings, loading, error, refetch } = useTournament(
    id ?? null,
  );
  const clock = useTournamentClock(tournament);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState('');
  const [editScoreB, setEditScoreB] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdvanceRound = async () => {
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert(
                'Last Round',
                'All rounds are complete. End the tournament?',
                [
                  { text: 'Not yet', style: 'cancel' },
                  {
                    text: 'End Tournament',
                    style: 'destructive',
                    onPress: () => handleEndTournament(true),
                  },
                ],
              );
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', e.message);
      } finally {
        setActionLoading(null);
      }
    };

    if (skipConfirm) {
      await doEnd();
      return;
    }

    Alert.alert(
      'End Tournament',
      'This will finalize the tournament. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: doEnd },
      ],
    );
  };

  // ─── Score Override ──────────────────────────────────────────────────────────

  const handleEditMatch = (
    matchId: string,
    teamAScore: number | null,
    teamBScore: number | null,
  ) => {
    setEditingMatchId(matchId);
    setEditScoreA(teamAScore != null ? String(teamAScore) : '');
    setEditScoreB(teamBScore != null ? String(teamBScore) : '');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCancelEdit = () => {
    setEditingMatchId(null);
    setEditScoreA('');
    setEditScoreB('');
  };

  const handleOverrideScore = async () => {
    if (!editingMatchId || !tournament) return;
    const a = parseInt(editScoreA, 10);
    const b = parseInt(editScoreB, 10);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      Alert.alert('Invalid', 'Both scores must be non-negative numbers.');
      return;
    }
    if (a + b !== tournament.points_per_match) {
      Alert.alert(
        'Invalid Total',
        `Scores must add up to ${tournament.points_per_match}.`,
      );
      return;
    }
    setActionLoading('override');
    try {
      await overrideScore(editingMatchId, a, b);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingMatchId(null);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAnonymise = async (enabled: boolean) => {
    if (!id) return;
    try {
      await toggleAnonymisePlayers(id, enabled);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message);
    }
  };

  const playerName = (id: string | null) => {
    if (!id) return '?';
    const p = players.find((pl) => pl.playerId === id);
    return p?.displayName ?? '?';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.opticYellow} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !tournament) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.opticYellow}
            />
          }
        >
          <Text style={styles.errorText}>{error ?? 'Tournament not found'}</Text>
          <Text style={styles.errorHint}>Pull down to retry</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const scoredCount = currentRoundMatches.filter(
    (m) => m.team_a_score !== null,
  ).length;

  return (
    <>
      <Stack.Screen options={{
        headerTitle: () => (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: Colors.textPrimary, letterSpacing: 2 }}>DASHBOARD</Text>
            <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted }} numberOfLines={1}>{tournament?.name ?? ''}</Text>
          </View>
        ),
      }} />
      <SafeAreaView testID="screen-organiser" style={styles.safe} edges={['bottom']}>
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
          {/* Clock Display */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Card variant="highlighted">
              <View style={styles.clockSection}>
                <ClockDisplay
                  formattedTime={clock.formattedTime}
                  isRunning={clock.isRunning}
                  isExpired={clock.isExpired}
                  size="lg"
                />
              </View>
            </Card>
          </Animated.View>

          {/* Status Bar */}
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
            <Card>
              <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusValue}>
                  {tournament.current_round ?? 1}
                </Text>
                <Text style={styles.statusLabel}>ROUND</Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <Text style={styles.statusValue}>
                  {scoredCount}/{currentRoundMatches.length}
                </Text>
                <Text style={styles.statusLabel}>SCORES IN</Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <Text style={styles.statusValue}>{players.length}</Text>
                <Text style={styles.statusLabel}>PLAYERS</Text>
              </View>
            </View>
            </Card>
          </Animated.View>

          {/* QR Code — compact mode for in-tournament sharing */}
          {tournament.id && (
            <TournamentQR
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              joinCode={tournament.join_code}
              compact
            />
          )}

          {/* Clock Controls */}
          <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>CLOCK</Text>
            <View style={styles.buttonRow}>
              <View style={styles.flex1}>
                <Button
                  title={tournament.master_clock_running ? 'PAUSE' : 'START'}
                  onPress={handleClockToggle}
                  loading={actionLoading === 'clock'}
                  variant={
                    tournament.master_clock_running ? 'outline' : 'primary'
                  }
                  size="md"
                />
              </View>
              <View style={styles.flex1}>
                <Button
                  title="RESET"
                  onPress={handleResetClock}
                  loading={actionLoading === 'reset'}
                  variant="outline"
                  size="md"
                />
              </View>
            </View>
          </Animated.View>

          {/* Current Round Matches */}
          <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>
              ROUND {tournament.current_round ?? 1} MATCHES
            </Text>
            {currentRoundMatches.length === 0 ? (
              <Text style={styles.emptyText}>No matches this round.</Text>
            ) : (
              currentRoundMatches.map((match) => {
                const hasScore = match.team_a_score !== null;
                const isEditing = editingMatchId === match.id;
                const badgeVariant =
                  match.status === 'approved'
                    ? 'success'
                    : match.status === 'reported'
                      ? 'warning'
                      : 'default';
                const badgeLabel =
                  match.status === 'approved'
                    ? 'approved ✓'
                    : match.status;

                return (
                  <AnimatedPressable
                    key={match.id}
                    onPress={() => {
                      if (!isEditing && !match.bye_player_id) {
                        handleEditMatch(
                          match.id,
                          match.team_a_score,
                          match.team_b_score,
                        );
                      }
                    }}
                    disabled={isEditing || !!match.bye_player_id}
                    accessibilityRole="button"
                    accessibilityLabel={`Court ${match.court_number ?? 'unknown'}: ${playerName(match.player1_id)} and ${playerName(match.player2_id)} versus ${playerName(match.player3_id)} and ${playerName(match.player4_id)}${hasScore ? `, score ${match.team_a_score} to ${match.team_b_score}` : ''}`}
                    accessibilityHint={hasScore ? 'Tap to override score' : 'Tap to enter score'}
                  >
                    <Card>
                      <View style={styles.matchHeader}>
                        <Text style={styles.courtText}>
                          Court {match.court_number ?? '—'}
                        </Text>
                        <Badge label={badgeLabel} variant={badgeVariant} />
                      </View>
                      <View style={styles.matchTeams}>
                        <View style={styles.matchTeam}>
                          <Text style={styles.matchTeamPlayers} numberOfLines={1}>
                            {playerName(match.player1_id)} &{' '}
                            {playerName(match.player2_id)}
                          </Text>
                        </View>
                        <View style={styles.matchScoreCenter}>
                          <Text
                            style={[
                              styles.matchScore,
                              hasScore && styles.matchScoreReported,
                              match.status === 'approved' &&
                                styles.matchScoreApproved,
                            ]}
                          >
                            {hasScore
                              ? `${match.team_a_score} – ${match.team_b_score}`
                              : 'vs'}
                          </Text>
                        </View>
                        <View style={styles.matchTeam}>
                          <Text
                            style={[
                              styles.matchTeamPlayers,
                              styles.matchTeamRight,
                            ]}
                            numberOfLines={1}
                          >
                            {playerName(match.player3_id)} &{' '}
                            {playerName(match.player4_id)}
                          </Text>
                        </View>
                      </View>

                      {/* Inline score override editor */}
                      {isEditing && (
                        <View style={styles.editSection}>
                          <View style={styles.editDivider} />
                          <Text style={styles.editTitle}>{hasScore ? 'OVERRIDE SCORE' : 'ENTER SCORE'}</Text>
                          <View style={styles.editScoreRow}>
                            <View style={styles.editScoreField}>
                              <Text style={styles.editScoreLabel}>TEAM A</Text>
                              <TextInput
                                style={styles.editInput}
                                value={editScoreA}
                                onChangeText={setEditScoreA}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="0"
                                placeholderTextColor={Colors.textMuted}
                                selectTextOnFocus
                                accessibilityLabel="Team A score"
                              />
                            </View>
                            <Text style={styles.editDash} accessible={false}>–</Text>
                            <View style={styles.editScoreField}>
                              <Text style={styles.editScoreLabel}>TEAM B</Text>
                              <TextInput
                                style={styles.editInput}
                                value={editScoreB}
                                onChangeText={setEditScoreB}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="0"
                                placeholderTextColor={Colors.textMuted}
                                selectTextOnFocus
                                accessibilityLabel="Team B score"
                              />
                            </View>
                          </View>
                          {tournament?.points_per_match != null && (
                            <Text style={styles.editHint}>
                              Must total {tournament.points_per_match}
                            </Text>
                          )}
                          <View style={styles.editActions}>
                            <View style={styles.flex1}>
                              <Button
                                title="CANCEL"
                                onPress={handleCancelEdit}
                                variant="outline"
                                size="sm"
                              />
                            </View>
                            <View style={styles.flex1}>
                              <Button
                                title="SAVE"
                                onPress={handleOverrideScore}
                                loading={actionLoading === 'override'}
                                variant="primary"
                                size="sm"
                              />
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Tap hint */}
                      {!isEditing && !match.bye_player_id && (
                        <Text style={styles.tapHint}>
                          {hasScore ? 'Tap to override' : 'Tap to enter score'}
                        </Text>
                      )}
                    </Card>
                  </AnimatedPressable>
                );
              })
            )}
          </Animated.View>

          {/* Live Standings */}
          {standings.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(400).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>LIVE STANDINGS</Text>
              <Card>
                {/* Header */}
                <View style={styles.standingsHeader}>
                  <Text style={[styles.standingsRank, styles.standingsHeaderText]}>#</Text>
                  <Text style={[styles.standingsName, styles.standingsHeaderText]}>PLAYER</Text>
                  <Text style={[styles.standingsStat, styles.standingsHeaderText]}>W</Text>
                  <Text style={[styles.standingsStat, styles.standingsHeaderText]}>P</Text>
                  <Text style={[styles.standingsPts, styles.standingsHeaderText]}>PTS</Text>
                </View>
                {/* Rows */}
                {standings.map((entry, i) => {
                  const medalColor =
                    i === 0 ? Colors.gold
                    : i === 1 ? Colors.silver
                    : i === 2 ? Colors.bronze
                    : undefined;
                  return (
                    <View
                      key={entry.playerId}
                      style={[
                        styles.standingsRow,
                        medalColor && { borderLeftColor: medalColor, borderLeftWidth: 3 },
                      ]}
                    >
                      <Text style={styles.standingsRank}>{i + 1}</Text>
                      <Text style={styles.standingsName} numberOfLines={1}>
                        {entry.displayName}
                      </Text>
                      <Text style={styles.standingsStat}>{entry.wins}</Text>
                      <Text style={styles.standingsStat}>{entry.matchesPlayed}</Text>
                      <Text style={styles.standingsPts}>{entry.pointsFor}</Text>
                    </View>
                  );
                })}
              </Card>
            </Animated.View>
          )}

          {/* Settings */}
          <Animated.View entering={FadeInDown.delay(500).duration(400).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>SETTINGS</Text>
            <Card>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleLabel}>Anonymise Players</Text>
                  <Text style={styles.toggleHint}>
                    Hide real names from non-organisers
                  </Text>
                </View>
                <Switch
                  testID="switch-anonymise"
                  value={tournament.anonymise_players}
                  onValueChange={handleToggleAnonymise}
                  trackColor={{ false: Colors.surface, true: Colors.opticYellow }}
                  thumbColor={
                    tournament.anonymise_players ? Colors.darkBg : Colors.textSecondary
                  }
                  ios_backgroundColor={Colors.surface}
                />
              </View>
            </Card>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(600).duration(400).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIONS</Text>
            <Button
              title="ADVANCE ROUND"
              onPress={handleAdvanceRound}
              loading={actionLoading === 'advance'}
              variant="secondary"
              size="lg"
            />
            <Button
              title="END TOURNAMENT"
              onPress={() => handleEndTournament()}
              loading={actionLoading === 'end'}
              variant="outline"
              size="lg"
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[4] },
  loadingText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.textDim },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[10],
    gap: Spacing[6],
  },
  clockSection: {
    alignItems: 'center',
    paddingVertical: Spacing[5],
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  statusItem: { alignItems: 'center', gap: Spacing[1] },
  statusLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  statusValue: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: Colors.opticYellow,
  },
  statusDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  flex1: { flex: 1 },
  section: { gap: Spacing[3] },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  buttonRow: { flexDirection: 'row', gap: Spacing[3] },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[2],
  },
  courtText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchTeam: {
    flex: 1,
  },
  matchTeamPlayers: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
  },
  matchTeamRight: {
    textAlign: 'right',
  },
  matchScoreCenter: {
    paddingHorizontal: Spacing[2],
    alignItems: 'center',
  },
  matchScore: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.textMuted,
  },
  matchScoreReported: {
    color: Colors.opticYellow,
    fontSize: 20,
  },
  matchScoreApproved: {
    color: Colors.success,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing[4],
  },
  // ─── Score Override Editor ──────────────────────────────────────────────────
  editSection: {
    gap: Spacing[3],
    paddingTop: Spacing[1],
  },
  editDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[1],
  },
  editTitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.opticYellow,
    letterSpacing: 2,
    textAlign: 'center',
  },
  editScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
  editScoreField: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  editScoreLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  editInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 64,
    paddingVertical: 10,
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
  },
  editDash: {
    fontFamily: Fonts.mono,
    fontSize: 20,
    color: Colors.textMuted,
    marginTop: Spacing[4],
  },
  editHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  tapHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing[2],
  },
  // ─── Toggle Row ────────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  toggleTextWrap: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  toggleHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  // ─── Error State ────────────────────────────────────────────────────────────
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  // ─── Live Standings ─────────────────────────────────────────────────────────
  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing[1],
  },
  standingsHeaderText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingLeft: Spacing[1],
  },
  standingsRank: {
    width: 28,
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textDim,
    textAlign: 'center',
  },
  standingsName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.text,
  },
  standingsStat: {
    width: 32,
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textDim,
    textAlign: 'center',
  },
  standingsPts: {
    width: 40,
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.opticYellow,
    textAlign: 'right',
  },
});
