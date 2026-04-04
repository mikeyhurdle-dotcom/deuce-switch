import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../src/providers/AuthProvider';
import { useTournament } from '../../../../src/hooks/useTournament';
import { Alpha, Colors, Fonts, Shadows, Spacing, Radius } from '../../../../src/lib/constants';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { ShareCard } from '../../../../src/components/ShareCard';
import { shareResultsCard } from '../../../../src/services/share-service';
import { createTournamentPost } from '../../../../src/services/feed-service';
import LeaderboardFilterRow, {
  type LeaderboardFilter,
} from '../../../../src/components/tournament/LeaderboardFilterRow';
import SmashdLogoRow from '../../../../src/components/tournament/SmashdLogoRow';
import ShareStylePicker, {
  type ShareTheme,
} from '../../../../src/components/tournament/ShareStylePicker';

// ── Types ──────────────────────────────────────────────────────────────────
type Standing = {
  playerId: string;
  displayName: string;
  pointsFor: number;
  pointsAgainst: number;
  wins: number;
  matchesPlayed: number;
  draws: number;
  winRate: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────
const MEDAL_COLORS = [Colors.gold, Colors.silver, Colors.bronze] as const;
const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Amazing!'] as const;
const STAR_COLORS = [
  Colors.error,
  Colors.warning,
  Colors.opticYellow,
  Colors.aquaGreen,
  Colors.opticYellow,
] as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getMedalColor(index: number): string | undefined {
  return index < 3 ? MEDAL_COLORS[index] : undefined;
}

// ── Confetti ──────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#CCFF00', '#7C3AED', '#2DD4BF', '#FFD700', '#EF4444', '#F59E0B'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CONFETTI_COUNT = 30;

type ConfettiPiece = {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  drift: number;
};

function generatePieces(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 6,
    delay: Math.random() * 800,
    duration: 2000 + Math.random() * 2000,
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 60,
  }));
}

function ConfettiPieceView({ piece }: { piece: ConfettiPiece }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: piece.duration, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -20 + progress.value * 320 },
      { translateX: progress.value * piece.drift },
      { rotate: `${piece.rotation + progress.value * 720}deg` },
    ],
    opacity: progress.value < 0.8 ? 1 : 1 - (progress.value - 0.8) * 5,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: piece.x,
          top: 0,
          width: piece.size,
          height: piece.size * 0.6,
          backgroundColor: piece.color,
          borderRadius: 2,
        },
        animStyle,
      ]}
    />
  );
}

function ConfettiOverlay() {
  const pieces = useMemo(() => generatePieces(), []);

  // Victory haptic burst on mount
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPieceView key={p.id} piece={p} />
      ))}
    </View>
  );
}

// ── Celebration Header ─────────────────────────────────────────────────────
function CelebrationHeader({
  tournament,
  playerCount,
}: {
  tournament: { name: string; tournament_format: string };
  playerCount: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.celebHeader}>
      <View style={styles.celebBadge}>
        <Ionicons name="checkmark-circle" size={14} color={Colors.darkBg} />
        <Text style={styles.celebBadgeText}>Tournament Complete</Text>
      </View>
      <Text style={styles.celebTitle}>{tournament.name}</Text>
      <Text style={styles.celebDetails}>
        <Text style={styles.celebHighlight}>{playerCount}</Text> players ·{' '}
        <Text style={styles.celebHighlight}>
          {tournament.tournament_format.charAt(0).toUpperCase() +
            tournament.tournament_format.slice(1)}
        </Text>
      </Text>
    </Animated.View>
  );
}

// ── MVP Card ───────────────────────────────────────────────────────────────
const MVP_CARD_WIDTH = Dimensions.get('window').width - Spacing[5] * 2;

function MVPCard({ winner }: { winner: Standing }) {
  const shimmerX = useSharedValue(-MVP_CARD_WIDTH);

  useEffect(() => {
    shimmerX.value = withDelay(
      1000,
      withRepeat(
        withTiming(MVP_CARD_WIDTH, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.duration(600).delay(200)}>
      <LinearGradient
        colors={['rgba(255,215,0,0.08)', Alpha.yellow04]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mvpCard}
      >
        {/* Shimmer sweep */}
        <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none" />

        <Text style={styles.mvpLabel}>MOST VALUABLE PLAYER</Text>
        <Ionicons name="trophy" size={28} color={Colors.gold} />
        <View style={styles.mvpAvatarRing}>
          <View style={styles.mvpAvatar}>
            <Text style={styles.mvpAvatarText}>{getInitials(winner.displayName)}</Text>
          </View>
        </View>
        <Text style={styles.mvpName}>{winner.displayName}</Text>
        <View style={styles.mvpStatsRow}>
          <View style={styles.mvpStat}>
            <Text style={styles.mvpStatValue}>{winner.pointsFor}</Text>
            <Text style={styles.mvpStatLabel}>Points</Text>
          </View>
          <View style={styles.mvpDivider} />
          <View style={styles.mvpStat}>
            <Text style={styles.mvpStatValue}>{winner.wins}</Text>
            <Text style={styles.mvpStatLabel}>Wins</Text>
          </View>
          <View style={styles.mvpDivider} />
          <View style={styles.mvpStat}>
            <Text style={styles.mvpStatValue}>
              {Math.round(winner.winRate * 100)}%
            </Text>
            <Text style={styles.mvpStatLabel}>Win Rate</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Podium ─────────────────────────────────────────────────────────────────
// Stagger delays — 3rd reveals first, then 2nd, then 1st (dramatic winner reveal)
const PODIUM_DELAYS = { 3: 400, 2: 700, 1: 1000 } as const;
const PODIUM_SPRING = { damping: 14, stiffness: 120, mass: 0.8 };

function PodiumColumn({
  entry,
  rank,
  height,
  isMe,
}: {
  entry: Standing;
  rank: number;
  height: number;
  isMe: boolean;
}) {
  const medal = getMedalColor(rank - 1);
  const avatarSize = rank === 1 ? 56 : 48;
  const borderW = rank === 1 ? 3 : 2;
  const staggerDelay = PODIUM_DELAYS[rank as 1 | 2 | 3] ?? 400;

  // Animate the podium block growing from 0 height
  const blockHeight = useSharedValue(0);
  const colOpacity = useSharedValue(0);
  const avatarScale = useSharedValue(0.3);

  useEffect(() => {
    colOpacity.value = withDelay(staggerDelay, withTiming(1, { duration: 300 }));
    blockHeight.value = withDelay(
      staggerDelay,
      withTiming(height, { duration: 600, easing: Easing.out(Easing.back(1.2)) }),
    );
    avatarScale.value = withDelay(
      staggerDelay + 200,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) }),
    );
  }, []);

  const colAnimStyle = useAnimatedStyle(() => ({
    opacity: colOpacity.value,
  }));

  const blockAnimStyle = useAnimatedStyle(() => ({
    height: blockHeight.value,
  }));

  const avatarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  return (
    <Animated.View style={[styles.podiumCol, colAnimStyle]}>
      <Animated.View
        style={[
          styles.podiumAvatarRing,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderWidth: borderW,
          },
          medal ? { borderColor: medal } : undefined,
          rank === 1 && {
            shadowColor: Colors.gold,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          },
          avatarAnimStyle,
        ]}
      >
        <Text style={[styles.podiumAvatarText, rank === 1 && { fontSize: 18 }]}>
          {getInitials(entry.displayName)}
        </Text>
      </Animated.View>
      <Text style={styles.podiumName} numberOfLines={1}>
        {entry.displayName}
      </Text>
      {isMe && (
        <View style={styles.youTagSmall}>
          <Text style={styles.youTagSmallText}>YOU</Text>
        </View>
      )}
      <Text style={styles.podiumPts}>{entry.pointsFor} pts</Text>
      <Animated.View
        style={[
          styles.podiumBlock,
          { backgroundColor: medal ? `${medal}22` : Colors.surface },
          medal ? { borderColor: medal, borderWidth: 1 } : undefined,
          blockAnimStyle,
        ]}
      >
        <Text style={[styles.podiumRank, medal ? { color: medal } : undefined]}>
          {rank}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function Podium({
  standings,
  userId,
}: {
  standings: Standing[];
  userId?: string;
}) {
  if (standings.length < 3) return null;
  return (
    <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.podiumRow}>
      <PodiumColumn
        entry={standings[1]}
        rank={2}
        height={60}
        isMe={standings[1].playerId === userId}
      />
      <PodiumColumn
        entry={standings[0]}
        rank={1}
        height={80}
        isMe={standings[0].playerId === userId}
      />
      <PodiumColumn
        entry={standings[2]}
        rank={3}
        height={46}
        isMe={standings[2].playerId === userId}
      />
    </Animated.View>
  );
}

// ── Leaderboard Row ────────────────────────────────────────────────────────
function LeaderboardRow({
  entry,
  index,
  isMe,
}: {
  entry: Standing;
  index: number;
  isMe: boolean;
}) {
  const medal = getMedalColor(index);
  const losses = entry.matchesPlayed - entry.wins - entry.draws;
  return (
    <Animated.View entering={FadeInUp.duration(400).delay(index * 50)}>
      <View
        style={[
          styles.lbRow,
          isMe && styles.lbRowMe,
          medal && { borderLeftColor: medal, borderLeftWidth: 3 },
        ]}
      >
        <Text
          style={[styles.lbRank, medal ? { color: medal } : undefined]}
        >
          {index + 1}
        </Text>
        <View
          style={[
            styles.lbAvatar,
            medal ? { borderColor: medal } : { borderColor: Colors.surface },
          ]}
        >
          <Text style={styles.lbAvatarText}>{getInitials(entry.displayName)}</Text>
        </View>
        <View style={styles.lbNameCol}>
          <Text style={styles.lbName} numberOfLines={1}>
            {entry.displayName}
          </Text>
          {isMe && (
            <View style={styles.youTag}>
              <Text style={styles.youTagText}>YOU</Text>
            </View>
          )}
        </View>
        <Text style={styles.lbW}>{entry.wins}</Text>
        <Text style={styles.lbL}>{losses < 0 ? 0 : losses}</Text>
        <Text style={[styles.lbPts, medal ? { color: medal } : undefined]}>
          {entry.pointsFor}
        </Text>
      </View>
    </Animated.View>
  );
}

// ── Your Performance ───────────────────────────────────────────────────────
function YourPerformance({
  standing,
  rank,
  total,
}: {
  standing: Standing;
  rank: number;
  total: number;
}) {
  const losses = standing.matchesPlayed - standing.wins - standing.draws;
  const avgScore =
    standing.matchesPlayed > 0
      ? (standing.pointsFor / standing.matchesPlayed).toFixed(1)
      : '0';

  const stats = [
    { label: 'Total Pts', value: String(standing.pointsFor), color: Colors.opticYellow },
    { label: 'Wins', value: String(standing.wins), color: Colors.success },
    { label: 'Losses', value: String(losses < 0 ? 0 : losses), color: Colors.error },
    {
      label: 'Win Rate',
      value: `${Math.round(standing.winRate * 100)}%`,
      color: Colors.aquaGreen,
    },
    { label: 'Avg Score', value: avgScore, color: Colors.warning },
    { label: 'Pt Diff', value: standing.pointsFor > 0 ? `${standing.pointsFor - standing.pointsAgainst >= 0 ? '+' : ''}${standing.pointsFor - standing.pointsAgainst}` : '0', color: Colors.violetLight },
  ];

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(600)}>
      <View style={styles.perfCard}>
        <View style={styles.perfHeader}>
          <Text style={styles.perfTitle}>Your Performance</Text>
          <View style={styles.perfBadge}>
            <Text style={styles.perfBadgeText}>
              {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`} Place
            </Text>
          </View>
        </View>
        <View style={styles.perfGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.perfCell}>
              <Text style={[styles.perfValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.perfLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Star Rating ────────────────────────────────────────────────────────────
function StarRating() {
  const [rating, setRating] = useState(0);

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(700)}>
      <View style={styles.ratingCard}>
        <Text style={styles.ratingTitle}>Rate This Tournament</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => {
                Haptics.selectionAsync();
                setRating(star);
              }}
              hitSlop={6}
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={32}
                color={
                  star <= rating
                    ? STAR_COLORS[rating - 1]
                    : Colors.textMuted
                }
              />
            </Pressable>
          ))}
        </View>
        {rating > 0 && (
          <Animated.Text
            entering={FadeIn.duration(200)}
            style={[styles.ratingLabel, { color: STAR_COLORS[rating - 1] }]}
          >
            {STAR_LABELS[rating - 1]}
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
}

// ── Auto-Saved Notice ──────────────────────────────────────────────────────
function AutoSavedNotice() {
  return (
    <View style={styles.autoSaved}>
      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
      <Text style={styles.autoSavedText}>Results automatically saved to your profile</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function Results() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, refreshProfile } = useAuth();
  const { tournament, standings, loading, refetch } = useTournament(id ?? null);
  const shareRef = useRef<ViewShot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardFilter, setLeaderboardFilter] = useState<LeaderboardFilter>('game');
  const [shareTheme, setShareTheme] = useState<ShareTheme>('dark');
  const [postingToFeed, setPostingToFeed] = useState(false);
  const [postedToFeed, setPostedToFeed] = useState(false);

  // Find current player's standing for the personal share card
  const myStanding = useMemo(() => {
    if (!user?.id || standings.length === 0) return null;
    const idx = standings.findIndex((s) => s.playerId === user.id);
    if (idx === -1) return null;
    return { ...standings[idx], rank: idx + 1 };
  }, [user?.id, standings]);

  // Sync profile stats after tournament completes
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
        <View testID="state-results-loading" style={styles.center}>
          <ActivityIndicator size="large" color={Colors.opticYellow} />
          <Text style={styles.loadingText}>Loading results…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const winner = standings[0] ?? null;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: Colors.textPrimary, letterSpacing: 2 }}>RESULTS</Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textMuted }} numberOfLines={1}>{tournament?.name ?? ''}</Text>
            </View>
          ),
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.bodyBold, fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView testID="screen-tournament-results" style={styles.safe} edges={['bottom']}>
        {/* Confetti — overlays the entire screen */}
        <ConfettiOverlay />

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
          {/* Logo Row */}
          <SmashdLogoRow tournamentName={tournament.name} />

          {/* Celebration Header */}
          <CelebrationHeader
            tournament={tournament}
            playerCount={standings.length}
          />

          {/* MVP Card */}
          {winner && <MVPCard winner={winner} />}

          {/* Podium */}
          <Podium standings={standings} userId={user?.id} />

          {/* Leaderboard Filter */}
          <LeaderboardFilterRow
            activeFilter={leaderboardFilter}
            onFilterChange={setLeaderboardFilter}
          />

          {/* Full Standings */}
          <Animated.View entering={FadeInUp.duration(400).delay(500)}>
            <View style={styles.lbSection}>
              <View style={styles.lbHeader}>
                <Text style={styles.sectionTitle}>FINAL STANDINGS</Text>
              </View>
              {/* Column Headers */}
              <View style={styles.lbColHeaders}>
                <Text style={[styles.lbColH, { width: 28 }]}>#</Text>
                <View style={{ width: 32 }} />
                <Text style={[styles.lbColH, { flex: 1 }]}>PLAYER</Text>
                <Text style={[styles.lbColH, { width: 28 }]}>W</Text>
                <Text style={[styles.lbColH, { width: 28 }]}>L</Text>
                <Text style={[styles.lbColH, { width: 40, textAlign: 'right' }]}>
                  PTS
                </Text>
              </View>
              {standings.map((entry, i) => (
                <LeaderboardRow
                  key={entry.playerId}
                  entry={entry}
                  index={i}
                  isMe={entry.playerId === user?.id}
                />
              ))}
            </View>
          </Animated.View>

          {/* Your Performance */}
          {myStanding && (
            <YourPerformance
              standing={myStanding}
              rank={myStanding.rank}
              total={standings.length}
            />
          )}

          {/* Star Rating */}
          <StarRating />

          {/* Auto-Saved */}
          <AutoSavedNotice />

          {/* Share Style Picker */}
          <ShareStylePicker activeTheme={shareTheme} onThemeChange={setShareTheme} />

          {/* Primary CTA — Add to Feed */}
          <Animated.View entering={FadeInUp.duration(400).delay(800)} style={styles.actions}>
            <Pressable
              testID="btn-add-to-feed"
              onPress={async () => {
                if (postedToFeed || postingToFeed || !id || !tournament) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setPostingToFeed(true);
                try {
                  const rank = myStanding ? `#${myStanding.rank}` : '';
                  const content = rank
                    ? `Finished ${rank} in ${tournament.name}! 🏆`
                    : `Just played in ${tournament.name}! 🎾`;
                  await createTournamentPost(id, content);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setPostedToFeed(true);
                } catch (e: any) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert('Error', e.message ?? 'Failed to post to feed');
                } finally {
                  setPostingToFeed(false);
                }
              }}
              style={[styles.primaryCta, postedToFeed && { opacity: 0.5 }]}
              disabled={postedToFeed || postingToFeed}
            >
              {postingToFeed ? (
                <ActivityIndicator size="small" color={Colors.darkBg} />
              ) : (
                <Text style={styles.primaryCtaText}>
                  {postedToFeed ? 'POSTED TO FEED ✓' : 'ADD TO FEED'}
                </Text>
              )}
            </Pressable>

            {/* Secondary row */}
            <View style={styles.secondaryRow}>
              <Pressable
                testID="btn-share-results"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  shareResultsCard(shareRef);
                }}
                style={styles.secondaryBtn}
              >
                <Ionicons name="share-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.secondaryBtnText}>Share Results</Text>
              </Pressable>
              <View style={styles.secondaryDivider} />
              <Pressable
                testID="btn-back-to-home"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.replace('/(app)/(tabs)/home');
                }}
                style={styles.secondaryBtn}
              >
                <Ionicons name="home-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.secondaryBtnText}>Back to Home</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Off-screen cards for capture */}
        <View style={styles.offscreen}>
          <ViewShot ref={shareRef} options={{ format: 'png', quality: 1 }}>
            <ShareCard
              tournamentName={tournament.name}
              tournamentFormat={tournament.tournament_format}
              createdAt={tournament.created_at}
              standings={standings}
              theme={shareTheme}
            />
          </ViewShot>
        </View>
      </SafeAreaView>
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.textDim },
  container: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[12],
    gap: Spacing[6],
  },

  // ── Celebration Header ──
  celebHeader: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  celebBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.opticYellow,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  celebBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.darkBg,
  },
  celebTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  celebDetails: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  celebHighlight: {
    color: Colors.opticYellow,
    fontFamily: Fonts.bodySemiBold,
  },

  // ── MVP Card ──
  mvpCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    paddingVertical: Spacing[6],
    paddingHorizontal: Spacing[5],
    gap: 6,
    overflow: 'hidden' as const,
  },
  mvpLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 3,
  },
  mvpCrown: { fontSize: 28 },
  shimmer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: Alpha.white06,
    borderRadius: Radius.lg,
  },
  mvpAvatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  mvpAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvpAvatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    color: Colors.gold,
  },
  mvpName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  mvpStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[3],
    gap: Spacing[4],
  },
  mvpStat: { alignItems: 'center', gap: 2 },
  mvpStatValue: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.gold,
  },
  mvpStatLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  mvpDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.surfaceLight,
  },

  // ── Podium ──
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: Spacing[3],
    paddingTop: Spacing[4],
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  podiumAvatarRing: {
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  podiumAvatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  podiumName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textPrimary,
    textAlign: 'center',
    maxWidth: 80,
  },
  podiumPts: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  podiumRank: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textDim,
  },

  // ── Leaderboard ──
  lbSection: { gap: 6 },
  lbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  lbColHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  lbColH: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  lbRowMe: {
    borderWidth: 1,
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow04,
  },
  lbRank: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    color: Colors.textDim,
    width: 28,
    textAlign: 'center',
  },
  lbAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  lbAvatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  lbNameCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lbName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  youTag: {
    backgroundColor: Colors.opticYellow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  youTagText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.darkBg,
    letterSpacing: 1,
  },
  youTagSmall: {
    backgroundColor: Colors.opticYellow,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  youTagSmallText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 8,
    color: Colors.darkBg,
    letterSpacing: 1,
  },
  lbW: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.success,
    width: 28,
    textAlign: 'center',
  },
  lbL: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.error,
    opacity: 0.7,
    width: 28,
    textAlign: 'center',
  },
  lbPts: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    color: Colors.opticYellow,
    width: 40,
    textAlign: 'right',
  },

  // ── Your Performance ──
  perfCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Alpha.yellow12,
    padding: Spacing[5],
    gap: Spacing[4],
  },
  perfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  perfTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  perfBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  perfBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.opticYellow,
  },
  perfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  perfCell: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    gap: 4,
  },
  perfValue: {
    fontFamily: Fonts.mono,
    fontSize: 22,
    color: Colors.opticYellow,
  },
  perfLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Star Rating ──
  ratingCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[5],
    alignItems: 'center',
    gap: Spacing[3],
  },
  ratingTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  ratingLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
  },

  // ── Auto-Saved ──
  autoSaved: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    alignSelf: 'center',
  },
  autoSavedText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.success,
  },

  // ── Actions ──
  actions: {
    gap: 16,
  },
  primaryCta: {
    backgroundColor: Colors.opticYellow,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.glowYellow,
  },
  primaryCtaText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.darkBg,
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  secondaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.surfaceLight,
  },

  // ── Confetti ──
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    overflow: 'hidden' as const,
  },

  // ── Off-screen ──
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
});
