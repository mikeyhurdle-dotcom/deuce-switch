/**
 * TV Mode — 16:9 Spectator Display
 *
 * Designed for venue screens / Apple TV. Two auto-rotating views:
 * 1. Leaderboard — full standings table with rank, avatar, stats
 * 2. Courts — 2x2 grid of active matches with live scores
 *
 * Auto-rotates every 10s with a neon progress bar.
 * Uses Supabase Realtime via useTournament() for live updates.
 *
 * PLA-300
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTournament } from '../../../../src/hooks/useTournament';
import { useTournamentClock } from '../../../../src/hooks/useTournamentClock';
import { Colors, Fonts, Radius, Spacing } from '../../../../src/lib/constants';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROTATE_INTERVAL = 10_000; // 10s auto-rotate
const VIEWS = ['leaderboard', 'courts'] as const;
type TVView = (typeof VIEWS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

function getMedalColor(index: number): string | undefined {
  if (index === 0) return Colors.gold;
  if (index === 1) return Colors.silver;
  if (index === 2) return Colors.bronze;
  return undefined;
}

function getWinPercent(wins: number, played: number): string {
  if (played === 0) return '0%';
  return `${Math.round((wins / played) * 100)}%`;
}

// ── LIVE Pulse Badge ──────────────────────────────────────────────────────────

function LiveBadge() {
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulseOpacity);
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.liveDot, dotStyle]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function RotateProgressBar({
  activeView,
  isPaused,
}: {
  activeView: TVView;
  isPaused: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isPaused) {
      cancelAnimation(progress);
      return;
    }
    // Reset and animate 0→1 over ROTATE_INTERVAL
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: ROTATE_INTERVAL,
      easing: Easing.linear,
    });
  }, [activeView, isPaused]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
}

// ── Leaderboard View ──────────────────────────────────────────────────────────

function LeaderboardView({
  standings,
  players,
}: {
  standings: any[];
  players: { playerId: string; displayName: string }[];
}) {
  return (
    <View style={styles.leaderboardContainer}>
      {/* Column headers */}
      <View style={styles.lbHeaderRow}>
        <Text style={[styles.lbHeaderText, styles.lbRankCol]}>#</Text>
        <Text style={[styles.lbHeaderText, styles.lbPlayerCol]}>PLAYER</Text>
        <Text style={[styles.lbHeaderText, styles.lbStatCol]}>PTS</Text>
        <Text style={[styles.lbHeaderText, styles.lbStatCol]}>W</Text>
        <Text style={[styles.lbHeaderText, styles.lbStatCol]}>L</Text>
        <Text style={[styles.lbHeaderText, styles.lbStatCol]}>+/-</Text>
        <Text style={[styles.lbHeaderText, styles.lbStatColWide]}>WIN%</Text>
      </View>

      {/* Player rows */}
      {standings.slice(0, 8).map((entry, i) => {
        const medal = getMedalColor(i);
        const losses = Math.max(0, entry.matchesPlayed - entry.wins);
        const diff = entry.pointsFor - (entry.pointsAgainst ?? 0);
        const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;

        return (
          <Animated.View
            key={entry.playerId}
            entering={FadeIn.delay(i * 60).duration(300)}
            style={[
              styles.lbRow,
              medal != null && {
                borderLeftWidth: 3,
                borderLeftColor: medal,
              },
            ]}
          >
            <View style={styles.lbRankCol}>
              <Text
                style={[
                  styles.lbRank,
                  i === 0 && { color: Colors.gold },
                  i === 1 && { color: Colors.silver },
                  i === 2 && { color: Colors.bronze },
                ]}
              >
                {i + 1}
              </Text>
            </View>

            <View style={styles.lbPlayerCol}>
              <View
                style={[
                  styles.lbAvatar,
                  { borderColor: medal ?? Colors.surfaceLight },
                ]}
              >
                <Text
                  style={[
                    styles.lbAvatarText,
                    medal != null && { color: medal },
                  ]}
                >
                  {getInitials(entry.displayName)}
                </Text>
              </View>
              <Text style={styles.lbName} numberOfLines={1}>
                {entry.displayName}
              </Text>
            </View>

            <Text style={[styles.lbPoints, styles.lbStatCol]}>
              {entry.pointsFor}
            </Text>
            <Text style={[styles.lbWin, styles.lbStatCol]}>{entry.wins}</Text>
            <Text style={[styles.lbLoss, styles.lbStatCol]}>{losses}</Text>
            <Text
              style={[
                styles.lbDiff,
                styles.lbStatCol,
                diff > 0 && { color: Colors.success },
                diff < 0 && { color: Colors.error },
              ]}
            >
              {diffStr}
            </Text>
            <Text style={[styles.lbWinPct, styles.lbStatColWide]}>
              {getWinPercent(entry.wins, entry.matchesPlayed)}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ── Court Card ────────────────────────────────────────────────────────────────

function CourtCard({
  match,
  players,
}: {
  match: any;
  players: { playerId: string; displayName: string }[];
}) {
  const playerMap = new Map(players.map((p) => [p.playerId, p.displayName]));
  const getName = (pid: string | null) =>
    pid ? playerMap.get(pid) ?? 'Player' : '—';

  const teamANames = [match.player1_id, match.player2_id]
    .filter(Boolean)
    .map(getName);
  const teamBNames = [match.player3_id, match.player4_id]
    .filter(Boolean)
    .map(getName);

  const hasScore =
    match.team_a_score != null && match.team_b_score != null;
  const teamAScore = match.team_a_score ?? '—';
  const teamBScore = match.team_b_score ?? '—';

  return (
    <View style={styles.courtCard}>
      {/* Court label */}
      <Text style={styles.courtLabel}>
        COURT {match.court_number ?? '—'}
      </Text>

      <View style={styles.courtMatchup}>
        {/* Team A */}
        <View style={styles.courtTeam}>
          <View style={styles.courtAvatarRow}>
            {[match.player1_id, match.player2_id]
              .filter(Boolean)
              .map((pid: string, j: number) => (
                <View
                  key={pid}
                  style={[
                    styles.courtAvatar,
                    j > 0 && { marginLeft: -10 },
                  ]}
                >
                  <Text style={styles.courtAvatarText}>
                    {getInitials(getName(pid))}
                  </Text>
                </View>
              ))}
          </View>
          <Text style={styles.courtTeamNames} numberOfLines={1}>
            {teamANames.join(' & ')}
          </Text>
        </View>

        {/* Score */}
        <View style={styles.courtScoreBlock}>
          <Text style={styles.courtScore}>{teamAScore}</Text>
          <Text style={styles.courtVs}>VS</Text>
          <Text style={styles.courtScore}>{teamBScore}</Text>
        </View>

        {/* Team B */}
        <View style={styles.courtTeam}>
          <View style={styles.courtAvatarRow}>
            {[match.player3_id, match.player4_id]
              .filter(Boolean)
              .map((pid: string, j: number) => (
                <View
                  key={pid}
                  style={[
                    styles.courtAvatar,
                    j > 0 && { marginLeft: -10 },
                  ]}
                >
                  <Text style={styles.courtAvatarText}>
                    {getInitials(getName(pid))}
                  </Text>
                </View>
              ))}
          </View>
          <Text style={styles.courtTeamNames} numberOfLines={1}>
            {teamBNames.join(' & ')}
          </Text>
        </View>
      </View>

      {/* Status */}
      {hasScore && (
        <View style={styles.courtStatusBadge}>
          <Ionicons
            name="checkmark-circle"
            size={12}
            color={Colors.success}
          />
          <Text style={styles.courtStatusText}>SCORED</Text>
        </View>
      )}
    </View>
  );
}

// ── Courts View ───────────────────────────────────────────────────────────────

function CourtsView({
  matches,
  players,
}: {
  matches: any[];
  players: { playerId: string; displayName: string }[];
}) {
  if (matches.length === 0) {
    return (
      <View style={styles.courtsEmpty}>
        <Ionicons name="tennisball-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.courtsEmptyText}>No active matches</Text>
      </View>
    );
  }

  return (
    <View style={styles.courtsGrid}>
      {matches.slice(0, 4).map((match, i) => (
        <Animated.View
          key={match.id}
          entering={FadeIn.delay(i * 80).duration(300)}
          style={styles.courtGridItem}
        >
          <CourtCard match={match} players={players} />
        </Animated.View>
      ))}
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TVMode() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tournament, matches, currentRoundMatches, players, standings, loading } =
    useTournament(id ?? null);
  const clock = useTournamentClock(tournament);

  const [activeView, setActiveView] = useState<TVView>('leaderboard');
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auto-rotate ───────────────────────────────────────────────────────────

  const startRotation = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveView((prev) =>
        prev === 'leaderboard' ? 'courts' : 'leaderboard',
      );
    }, ROTATE_INTERVAL);
  }, []);

  const stopRotation = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isPaused) {
      startRotation();
    } else {
      stopRotation();
    }
    return stopRotation;
  }, [isPaused, startRotation, stopRotation]);

  const togglePause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused((p) => !p);
  }, []);

  const switchView = useCallback(
    (view: TVView) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveView(view);
      // Reset rotation timer on manual switch
      if (!isPaused) {
        stopRotation();
        startRotation();
      }
    },
    [isPaused, stopRotation, startRotation],
  );

  // Hide status bar for full-screen TV mode
  useEffect(() => {
    StatusBar.setHidden(true, 'fade');
    return () => StatusBar.setHidden(false, 'fade');
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading || !tournament) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingLogo}>SMASHD</Text>
          <Text style={styles.loadingText}>Connecting to tournament...</Text>
        </View>
      </>
    );
  }

  // Anonymise player names if the organiser toggled it on
  const displayPlayers = useMemo(() => {
    if (!tournament.anonymise_players) return players;
    return players.map((p, i) => ({
      ...p,
      displayName: `Player ${i + 1}`,
    }));
  }, [players, tournament.anonymise_players]);

  const displayStandings = useMemo(() => {
    if (!tournament.anonymise_players) return standings;
    // Build a stable playerId → "Player N" map from the players array
    const anonMap = new Map(
      players.map((p, i) => [p.playerId, `Player ${i + 1}`]),
    );
    return standings.map((entry) => ({
      ...entry,
      displayName: anonMap.get(entry.playerId) ?? 'Player',
    }));
  }, [standings, players, tournament.anonymise_players]);

  const currentRound = tournament.current_round ?? 1;
  const maxRound = matches.length > 0
    ? Math.max(...matches.map((m) => m.round_number ?? 0))
    : 0;
  const totalRounds = maxRound > currentRound ? maxRound : currentRound;
  const isLive = tournament.status === 'running';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View testID="screen-tv-mode" style={styles.container}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>SMASHD</Text>
            <View style={styles.headerDivider} />
            <Text style={styles.eventName} numberOfLines={1}>
              {tournament.name}
            </Text>
          </View>

          <View style={styles.headerCenter}>
            {isLive && <LiveBadge />}
          </View>

          <View style={styles.headerRight}>
            <View style={styles.roundPill}>
              <Ionicons
                name="layers-outline"
                size={14}
                color={Colors.textDim}
              />
              <Text style={styles.roundText}>
                ROUND {currentRound}/{totalRounds}
              </Text>
            </View>

            <View style={styles.clockPill}>
              <Ionicons
                name="time-outline"
                size={14}
                color={
                  clock.isExpired
                    ? Colors.error
                    : clock.isRunning
                      ? Colors.opticYellow
                      : Colors.textDim
                }
              />
              <Text
                style={[
                  styles.clockText,
                  clock.isExpired && { color: Colors.error },
                  clock.isRunning && { color: Colors.opticYellow },
                ]}
              >
                {clock.formattedTime}
              </Text>
            </View>

            {/* Close button */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={12}
            >
              <Ionicons
                name="close-circle-outline"
                size={24}
                color={Colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* ── Main Content ────────────────────────────────────────────────── */}
        <View style={styles.content}>
          {activeView === 'leaderboard' ? (
            <Animated.View
              key="lb"
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(200)}
              style={styles.viewContainer}
            >
              <LeaderboardView standings={displayStandings} players={displayPlayers} />
            </Animated.View>
          ) : (
            <Animated.View
              key="courts"
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(200)}
              style={styles.viewContainer}
            >
              <CourtsView
                matches={currentRoundMatches}
                players={displayPlayers}
              />
            </Animated.View>
          )}
        </View>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          {/* Auto-rotate controls */}
          <Pressable onPress={togglePause} style={styles.autoRotatePill}>
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={12}
              color={Colors.textDim}
            />
            <Text style={styles.autoRotateText}>
              {isPaused ? 'PAUSED' : 'AUTO-ROTATE'}
            </Text>
          </Pressable>

          {/* View indicator dots */}
          <View style={styles.viewDots}>
            {VIEWS.map((v) => (
              <Pressable key={v} onPress={() => switchView(v)} hitSlop={8}>
                <View
                  style={[
                    styles.dot,
                    activeView === v && styles.dotActive,
                  ]}
                />
              </Pressable>
            ))}
          </View>

          {/* Join code */}
          <View style={styles.joinCodePill}>
            <Ionicons name="qr-code-outline" size={14} color={Colors.textDim} />
            <Text style={styles.joinCodeText}>
              JOIN: {tournament.join_code ?? '—'}
            </Text>
          </View>
        </View>

        {/* ── Progress Bar ─────────────────────────────────────────────────── */}
        <RotateProgressBar activeView={activeView} isPaused={isPaused} />
      </View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Layout
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
  loadingLogo: {
    fontFamily: Fonts.display,
    fontSize: 48,
    color: Colors.opticYellow,
    letterSpacing: 2,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textDim,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
  },
  viewContainer: {
    flex: 1,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
    justifyContent: 'flex-end',
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.opticYellow,
    letterSpacing: 1,
  },
  headerDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.surfaceLight,
  },
  eventName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    flexShrink: 1,
  },

  // ── LIVE badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1] + 2,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  liveText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.error,
    letterSpacing: 2,
  },

  // ── Pills
  roundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[3] - 2,
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
  },
  roundText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  clockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[3] - 2,
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
  },
  clockText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textDim,
    letterSpacing: 2,
  },

  // ── Leaderboard
  leaderboardContainer: {
    flex: 1,
    gap: 2,
  },
  lbHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    marginBottom: Spacing[1],
  },
  lbHeaderText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  lbRankCol: {
    width: 40,
    textAlign: 'center' as const,
    alignItems: 'center' as const,
  },
  lbPlayerCol: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing[2],
  },
  lbStatCol: {
    width: 52,
    textAlign: 'center' as const,
  },
  lbStatColWide: {
    width: 64,
    textAlign: 'center' as const,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  lbRank: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.textDim,
    width: 40,
    textAlign: 'center',
  },
  lbAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textDim,
  },
  lbName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  lbPoints: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.opticYellow,
  },
  lbWin: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.success,
  },
  lbLoss: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.error,
  },
  lbDiff: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.textDim,
  },
  lbWinPct: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.aquaGreen,
  },

  // ── Courts
  courtsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[4],
    justifyContent: 'center',
    alignContent: 'center',
  },
  courtGridItem: {
    width: '47%',
    minWidth: 280,
  },
  courtsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  courtsEmptyText: {
    fontFamily: Fonts.body,
    fontSize: 18,
    color: Colors.textMuted,
  },

  // ── Court Card
  courtCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[5],
    gap: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  courtLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
    textAlign: 'center',
  },
  courtMatchup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courtTeam: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing[2],
  },
  courtAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courtAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
  },
  courtTeamNames: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  courtScoreBlock: {
    alignItems: 'center',
    gap: 2,
    minWidth: 80,
  },
  courtScore: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  courtVs: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  courtStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  courtStatusText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.success,
    letterSpacing: 1,
  },

  // ── Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  autoRotatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1] + 2,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.full,
  },
  autoRotateText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  viewDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
  },
  dotActive: {
    backgroundColor: Colors.opticYellow,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  joinCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1] + 2,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: Radius.full,
  },
  joinCodeText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
    letterSpacing: 1.5,
  },

  // ── Progress Bar
  progressTrack: {
    height: 2,
    backgroundColor: Colors.surface,
  },
  progressFill: {
    height: 2,
    backgroundColor: Colors.opticYellow,
  },
});
