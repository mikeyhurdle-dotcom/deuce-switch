import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Fonts, Spacing, Radius, Shadows, Alpha } from '../../../src/lib/constants';
import { SmashdLogo } from '../../../src/components/ui/SmashdLogo';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { SmashdWordmark } from '../../../src/components/ui/SmashdWordmark';
import { AnimatedPressable, useSpringPress } from '../../../src/hooks/useSpringPress';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Supabase join shapes — Supabase returns FK joins as objects (singular
 * relationship) but the generated client types may expose them as arrays.
 * We cast through `unknown` to bridge the gap safely.
 */
type RawTournamentJoin = {
  tournament_id: string;
  tournaments: { id: string; name: string; status: string; current_round: number | null } | null;
};

type RawUpcomingJoin = {
  tournament_id: string;
  tournaments: {
    id: string;
    name: string;
    status: string;
    tournament_format: string;
    max_players: number | null;
    created_at: string;
    club_id: string | null;
    clubs: { name: string } | null;
  } | null;
};

type RawPlayerCount = {
  tournament_id: string;
};

type RawMatchResult = {
  id: string;
  player_id: string;
  tournament_id: string | null;
  partner_name: string | null;
  opponent1_name: string | null;
  opponent2_name: string | null;
  team_score: number;
  opponent_score: number;
  won: boolean;
  source: string;
  played_at: string;
  set_scores: Array<{ team_a: number; team_b: number }> | null;
  tournaments: { name: string; tournament_format: string } | null;
};

type PlayThisWeekEvent = {
  id: string;
  name: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  format: string;
  level: string;
  price: string;
  spotsAvailable: number | null;
  status: string;
  registrationUrl: string | null;
};

type ActiveTournament = {
  tournament_id: string;
  tournament: {
    id: string;
    name: string;
    status: 'draft' | 'running' | 'completed';
    current_round: number | null;
  };
};

type UpcomingEvent = {
  id: string;
  date: string;
  name: string;
  venue: string;
  format: string;
  spotsLeft: number | 'FULL';
};

type FeedPostBase = {
  id: string;
  username: string;
  avatarUrl: string;
  timeAgo: string;
  likes: number;
  comments: number;
  likerNames?: string[];
  commentPreview?: { username: string; text: string };
};

type TournamentPost = FeedPostBase & {
  type: 'tournament';
  rank: number;
  eventName: string;
  eventVenue: string;
  format: string;
  points: number;
  record: string;
  winRate: string;
  roundCount: number;
  levelDelta?: string;
  conditions?: string[];
};

type ImportPost = FeedPostBase & {
  type: 'imported';
  team1: string;
  team2: string;
  score: string;
  result: 'won' | 'lost' | 'draw';
  source: string;
  sourceVenue: string;
};

type MilestonePost = FeedPostBase & {
  type: 'milestone';
  milestoneTitle: string;
  milestoneDesc: string;
};

type FeedPost = TournamentPost | ImportPost | MilestonePost;


// ─── Sub-Components ─────────────────────────────────────────────────────────

function LiveBanner({ tournament, onPress }: { tournament: ActiveTournament; onPress: () => void }) {
  const spring = useSpringPress();
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (tournament.tournament.status === 'running') {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
  }, [tournament.tournament.status]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const isLive = tournament.tournament.status === 'running';

  return (
    <AnimatedPressable
      style={[styles.liveBanner, spring.animatedStyle]}
      onPressIn={spring.onPressIn}
      onPressOut={spring.onPressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tournament.tournament.name}, ${isLive ? 'live' : 'in lobby'}`}
    >
      {/* Gradient background */}
      <LinearGradient
        colors={['rgba(124,58,237,0.25)', 'rgba(204,255,0,0.07)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated gradient stripe */}
      <Animated.View style={[styles.liveBannerStripe, pulseStyle]}>
        <LinearGradient
          colors={[Colors.violet, Colors.opticYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View style={[styles.liveBadge, !isLive && styles.lobbyBadge]}>
        {isLive && <View style={styles.liveDot} />}
        <Text style={styles.liveBadgeText}>{isLive ? 'LIVE' : 'LOBBY'}</Text>
      </View>

      <Text style={styles.liveBannerTitle} numberOfLines={1}>
        {tournament.tournament.name}
      </Text>
      <Text style={styles.liveBannerSub}>
        {isLive
          ? `You're playing \u2014 Round ${tournament.tournament.current_round ?? 1}`
          : 'Waiting in lobby \u2014 tap to rejoin'}
      </Text>

      <View style={styles.liveMeta}>
        <Text style={styles.liveMetaItem}>{'\uD83D\uDC65'} Players</Text>
        {isLive && (
          <Text style={styles.liveMetaItem}>
            {'\u23F1\uFE0F'} Round {tournament.tournament.current_round ?? 1}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

function UpcomingCard({ event }: { event: UpcomingEvent }) {
  const spring = useSpringPress();
  const isFull = event.spotsLeft === 'FULL';
  const isLow = typeof event.spotsLeft === 'number' && event.spotsLeft <= 2;

  return (
    <AnimatedPressable
      style={[styles.ucCard, spring.animatedStyle]}
      onPressIn={spring.onPressIn}
      onPressOut={spring.onPressOut}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      accessibilityRole="button"
      accessibilityLabel={`${event.name} at ${event.venue}, ${event.format}, ${isFull ? 'full' : `${event.spotsLeft} spots left`}`}
    >
      <Text style={styles.ucDate}>{event.date}</Text>
      <Text style={styles.ucName} numberOfLines={2}>{event.name}</Text>
      <Text style={styles.ucVenue} numberOfLines={1}>{'\uD83D\uDCCD'} {event.venue}</Text>
      <View style={styles.ucBottom}>
        <View style={styles.ucFormatPill}>
          <Text style={styles.ucFormatText}>{event.format}</Text>
        </View>
        <Text style={[styles.ucSpots, isLow && styles.ucSpotsLow, isFull && styles.ucSpotsFull]}>
          {isFull ? 'FULL' : `${event.spotsLeft} spots left`}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function PlayThisWeekCard({ event }: { event: PlayThisWeekEvent }) {
  const spring = useSpringPress();
  const isFull = event.status === 'full';
  const spotsText = isFull
    ? 'Full'
    : event.spotsAvailable != null && event.spotsAvailable <= 4
      ? `${event.spotsAvailable} left`
      : null;

  return (
    <AnimatedPressable
      style={[styles.ptwChip, spring.animatedStyle, isFull && styles.ptwChipFull]}
      onPressIn={spring.onPressIn}
      onPressOut={spring.onPressOut}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (event.registrationUrl) {
          Linking.openURL(event.registrationUrl);
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={`${event.venue}, ${event.time ?? event.date}, ${event.format}`}
    >
      <Text style={styles.ptwChipVenue} numberOfLines={1}>{event.venue}</Text>
      <Text style={styles.ptwChipDivider}>·</Text>
      <Text style={styles.ptwChipTime} numberOfLines={1}>{event.time || event.date}</Text>
      {spotsText && (
        <>
          <Text style={styles.ptwChipDivider}>·</Text>
          <Text style={[styles.ptwChipSpots, isFull && { color: Colors.error }]}>{spotsText}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

function getRankColor(rank: number): string {
  if (rank === 1) return Colors.gold;
  if (rank === 2) return Colors.silver;
  if (rank === 3) return Colors.bronze;
  return Colors.textDim;
}

function TournamentResultCard({ post }: { post: TournamentPost }) {
  const stats = [
    { val: String(post.points), label: 'POINTS' },
    { val: post.record, label: 'RECORD' },
    { val: post.winRate, label: 'WIN RATE' },
    ...(post.levelDelta ? [{ val: post.levelDelta, label: 'LEVEL \u0394' }] : []),
  ];
  return (
    <View style={styles.resultCard}>
      <View style={styles.prcPlacement}>
        {post.rank > 0 && (
          <Text style={[styles.prcRank, { color: getRankColor(post.rank) }]}>#{post.rank}</Text>
        )}
        <View style={styles.prcEvent}>
          <Text style={styles.prcEventName}>{post.eventName}</Text>
          <View style={styles.prcEventMeta}>
            <View style={styles.prcFormatPill}>
              <Text style={styles.prcFormatText}>{post.format}</Text>
            </View>
            {post.roundCount > 0 && (
              <Text style={styles.prcEventVenue}>{post.roundCount} rounds</Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.prcStats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.prcStat}>
            <Text style={styles.prcStatVal}>{s.val}</Text>
            <Text style={styles.prcStatLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      {post.conditions && post.conditions.length > 0 && (
        <View style={styles.prcConditions}>
          {post.conditions.map((c) => (
            <View key={c} style={styles.prcConditionPill}>
              <Text style={styles.prcConditionText}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ImportCard({ post }: { post: ImportPost }) {
  const rc = post.result === 'won' ? Colors.success : post.result === 'lost' ? Colors.error : Colors.warning;
  return (
    <View style={styles.importCard}>
      <View style={styles.importRow}>
        <View style={styles.importTeams}>
          <Text style={styles.importTeamText}>{post.team1}</Text>
          <Text style={styles.importVs}>vs</Text>
          <Text style={styles.importTeamText}>{post.team2}</Text>
        </View>
        <View style={styles.importScoreBlock}>
          <Text style={styles.importScore}>{post.score}</Text>
          <Text style={[styles.importResult, { color: rc }]}>{post.result.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.importSourceRow}>
        <View style={styles.importSourcePill}>
          <Text style={styles.importSourcePillText}>{post.source}</Text>
        </View>
        <Text style={styles.importSourceVenue}>{post.sourceVenue}</Text>
      </View>
    </View>
  );
}

function MilestoneCard({ post }: { post: MilestonePost }) {
  return (
    <View style={styles.milestoneCard}>
      <Text style={styles.milestoneEmoji}>{'\uD83C\uDFC6'}</Text>
      <Text style={styles.milestoneTitle}>{post.milestoneTitle}</Text>
      <Text style={styles.milestoneDesc}>{post.milestoneDesc}</Text>
    </View>
  );
}

function FeedPostItem({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const badgeMap = {
    tournament: { bg: Alpha.yellow12, fg: Colors.opticYellow, label: 'TOURNAMENT' },
    imported:   { bg: Alpha.aqua12,  fg: Colors.aquaGreen,   label: 'IMPORTED' },
    milestone:  { bg: 'rgba(255,215,0,0.12)',  fg: Colors.gold,        label: 'MILESTONE' },
  };
  const badge = badgeMap[post.type];

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => (next ? c + 1 : c - 1));
      return next;
    });
  };

  return (
    <View style={styles.feedPost}>
      <View style={styles.postHeader}>
        <Image source={{ uri: post.avatarUrl }} style={styles.postAvatar} />
        <View style={styles.postUserInfo}>
          <Text style={styles.postUsername}>{post.username}</Text>
          <View style={styles.postMetaRow}>
            <View style={[styles.postBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.postBadgeText, { color: badge.fg }]}>{badge.label}</Text>
            </View>
            <Text style={styles.postTime}>{post.timeAgo}</Text>
          </View>
        </View>
      </View>

      {post.type === 'tournament' && <TournamentResultCard post={post} />}
      {post.type === 'imported' && <ImportCard post={post} />}
      {post.type === 'milestone' && <MilestoneCard post={post} />}

      <View style={styles.postActions}>
        <Pressable
          style={styles.postAction}
          onPress={handleLike}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? Colors.coral : Colors.textMuted}
          />
          {likeCount > 0 && (
            <Text style={[styles.paCount, liked && { color: Colors.coral }]}>
              {likeCount}
            </Text>
          )}
        </Pressable>
        <Pressable
          style={styles.postAction}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          accessibilityRole="button"
          accessibilityLabel="Comment"
        >
          <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} />
          {post.comments > 0 && (
            <Text style={styles.paCount}>{post.comments}</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.postAction}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Ionicons name="arrow-redo-outline" size={20} color={Colors.textMuted} />
          <Text style={styles.paCount}>Share</Text>
        </Pressable>
      </View>

      {/* Likes summary */}
      {likeCount > 0 && (
        <View style={styles.likesSummary}>
          <Ionicons name="heart" size={12} color={Colors.coral} />
          <Text style={styles.likesSummaryText}>
            {post.likerNames && post.likerNames.length > 0
              ? likeCount <= 2
                ? post.likerNames.slice(0, 2).join(' and ') + ' liked this'
                : `${post.likerNames[0]}, ${post.likerNames[1]} and ${likeCount - 2} others liked this`
              : `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
          </Text>
        </View>
      )}

      {/* Comment preview */}
      {post.commentPreview && (
        <View style={styles.commentPreview}>
          <Text style={styles.commentPreviewUser}>{post.commentPreview.username}</Text>
          <Text style={styles.commentPreviewText} numberOfLines={2}>
            {post.commentPreview.text}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
// "The most important step a man can take is the next one."

export default function Home() {
  const { profile, user, refreshProfile } = useAuth();
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null);
  const [loadingActive, setLoadingActive] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [playThisWeek, setPlayThisWeek] = useState<PlayThisWeekEvent[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    // notifications table not yet created — always 0 for now
    setUnreadNotifCount(0);
  }, []);

  const fetchActive = useCallback(async () => {
    if (!user) { setLoadingActive(false); return; }
    setLoadingActive(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from('tournament_players')
        .select(`
          tournament_id,
          tournaments (
            id,
            name,
            status,
            current_round
          )
        `)
        .eq('player_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
        .abortSignal(controller.signal);

      clearTimeout(timeout);

      if (error) { setActiveTournament(null); setLoadingActive(false); return; }

      const raw = (data ?? []) as unknown as RawTournamentJoin[];
      // Filter client-side for active tournaments (draft or running)
      const match = raw.find(
        (r) => r.tournaments && (r.tournaments.status === 'draft' || r.tournaments.status === 'running'),
      );
      if (match?.tournaments) {
        setActiveTournament({
          tournament_id: match.tournament_id,
          tournament: {
            id: match.tournaments.id,
            name: match.tournaments.name,
            status: match.tournaments.status as ActiveTournament['tournament']['status'],
            current_round: match.tournaments.current_round,
          },
        });
      } else {
        setActiveTournament(null);
      }
    } catch {
      setActiveTournament(null);
    } finally {
      setLoadingActive(false);
    }
  }, [user]);

  // Fetch upcoming draft/running tournaments the user is part of (excluding the active one)
  const fetchUpcoming = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('tournament_players')
        .select(`
          tournament_id,
          tournaments (
            id,
            name,
            status,
            tournament_format,
            max_players,
            created_at,
            club_id,
            clubs ( name )
          )
        `)
        .eq('player_id', user.id)
        .in('tournaments.status', ['draft', 'running'])
        .order('created_at', { ascending: false })
        .limit(6);

      const raw = (data ?? []) as unknown as RawUpcomingJoin[];
      const activeId = activeTournament?.tournament?.id;

      // Count players per tournament for spots calculation
      const tournamentIds = raw
        .filter((r): r is RawUpcomingJoin & { tournaments: NonNullable<RawUpcomingJoin['tournaments']> } =>
          r.tournaments != null && r.tournaments.id !== activeId)
        .map((r) => r.tournaments.id);

      let playerCounts: Record<string, number> = {};
      if (tournamentIds.length > 0) {
        const { data: counts } = await supabase
          .from('tournament_players')
          .select('tournament_id')
          .in('tournament_id', tournamentIds);
        (counts ?? [] as RawPlayerCount[]).forEach((c: RawPlayerCount) => {
          playerCounts[c.tournament_id] = (playerCounts[c.tournament_id] ?? 0) + 1;
        });
      }

      const events: UpcomingEvent[] = raw
        .filter((r): r is RawUpcomingJoin & { tournaments: NonNullable<RawUpcomingJoin['tournaments']> } =>
          r.tournaments != null && r.tournaments.id !== activeId)
        .map((r) => {
          const t = r.tournaments;
          const playerCount = playerCounts[t.id] ?? 0;
          const maxPlayers = t.max_players;
          const spotsLeft = maxPlayers ? Math.max(0, maxPlayers - playerCount) : null;
          const formatLabel = t.tournament_format === 'americano' ? 'Americano'
            : t.tournament_format === 'mexicano' ? 'Mexicano'
            : t.tournament_format === 'team_americano' ? 'Team Americano'
            : t.tournament_format === 'mixicano' ? 'Mixicano'
            : t.tournament_format;
          const created = new Date(t.created_at);
          const now = new Date();
          const diffDays = Math.round((created.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          let dateStr = created.toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
          if (diffDays === 0) dateStr = `Today \u00B7 ${created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
          else if (diffDays === 1) dateStr = `Tomorrow \u00B7 ${created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

          return {
            id: t.id,
            date: dateStr,
            name: t.name,
            venue: t.clubs?.name ?? 'TBC',
            format: formatLabel,
            spotsLeft: spotsLeft === 0 ? ('FULL' as const) : (spotsLeft ?? 0),
          };
        });

      setUpcomingEvents(events);
    } catch {
      // Fail silently
    }
  }, [user, activeTournament]);

  // Fetch "Play This Week" events from scout events, personalised by user location + level
  const fetchPlayThisWeek = useCallback(async () => {
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const nextWeek = new Date(now.getTime() + 7 * 86400000);
      const endDate = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

      let query = supabase
        .from('upcoming_scout_events')
        .select('*')
        .gte('event_date', today)
        .lte('event_date', endDate)
        .neq('status', 'full')
        .order('event_date')
        .order('start_time')
        .limit(8);

      // Filter by user's city if they have a location set
      if (profile?.location) {
        // Extract city name — profile.location might be "London", "London, UK", or a postcode
        const city = profile.location.split(',')[0].trim();
        if (city.length > 2) {
          query = query.ilike('city', `%${city}%`);
        }
      }

      const { data, error } = await query;
      if (error || !data) { setPlayThisWeek([]); return; }

      const formatLabel = (v: string) =>
        v.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      const formatPrice = (cents: number | null, currency: string | null) => {
        if (cents === null || cents === 0) return 'Free';
        const sym: Record<string, string> = { GBP: '£', EUR: '€', USD: '$', SEK: 'kr' };
        const s = sym[(currency ?? 'GBP').toUpperCase()] ?? (currency ?? '');
        return `${s}${Math.floor(cents / 100)}`;
      };

      const formatTime = (start: string | null, end: string | null) => {
        if (!start) return '';
        const fmt = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          const suffix = h >= 12 ? 'pm' : 'am';
          const h12 = h % 12 || 12;
          return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
        };
        return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
      };

      const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const events: PlayThisWeekEvent[] = (data as any[]).map((r) => {
        const [y, m, d] = (r.event_date as string).split('-').map(Number);
        const eventDate = new Date(y, m - 1, d);
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((eventDate.getTime() - todayDate.getTime()) / 86400000);

        let dateStr: string;
        if (diffDays === 0) dateStr = 'Today';
        else if (diffDays === 1) dateStr = 'Tomorrow';
        else dateStr = `${DAY_NAMES[eventDate.getDay()]} ${eventDate.getDate()} ${MONTH_NAMES[eventDate.getMonth()]}`;

        return {
          id: r.id as string,
          name: r.name as string,
          venue: (r.venue_name as string) ?? 'TBC',
          city: (r.city as string) ?? '',
          date: dateStr,
          time: formatTime(r.start_time, r.end_time),
          format: formatLabel(r.format as string),
          level: formatLabel(r.level as string),
          price: formatPrice(r.price_cents, r.currency),
          spotsAvailable: r.spots_available as number | null,
          status: r.status as string,
          registrationUrl: r.registration_url as string | null,
        };
      });

      setPlayThisWeek(events);
    } catch {
      // Non-critical
    }
  }, [profile?.location]);

  // Fetch recent match results as activity feed
  const fetchFeed = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch more rows so we can aggregate tournament rounds into single cards
      const { data } = await supabase
        .from('player_match_results')
        .select(`
          id,
          player_id,
          tournament_id,
          partner_name,
          opponent1_name,
          opponent2_name,
          team_score,
          opponent_score,
          won,
          source,
          played_at,
          set_scores,
          tournaments ( name, tournament_format )
        `)
        .eq('player_id', user.id)
        .order('played_at', { ascending: false })
        .limit(50);

      if (!data || data.length === 0) {
        setFeedPosts([]);
        return;
      }

      const displayName = profile?.display_name ?? 'You';
      const avatarUrl = profile?.game_face_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7C3AED&color=fff`;
      const rows = data as unknown as RawMatchResult[];

      function formatTimeAgo(iso: string): string {
        const playedAt = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - playedAt.getTime();
        const diffMin = Math.max(0, Math.floor(diffMs / 60000));
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);
        return diffMs < 0 ? 'just now'
          : diffMin < 60 ? `${diffMin}m ago`
          : diffHr < 24 ? `${diffHr}h ago`
          : diffDay <= 30 ? `${diffDay}d ago`
          : playedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDay > 365 ? 'numeric' : undefined });
      }

      const FORMAT_LABELS: Record<string, string> = {
        americano: 'Americano',
        mexicano: 'Mexicano',
        team_americano: 'Team Americano',
        mixicano: 'Mixicano',
      };

      // ── Separate tournament vs non-tournament rows ──
      const tournamentRows = new Map<string, RawMatchResult[]>();
      const standaloneRows: RawMatchResult[] = [];

      for (const r of rows) {
        const isTournament = r.tournament_id && r.tournaments
          && r.source !== 'manual' && r.source !== 'playtomic' && r.source !== 'screenshot';
        if (isTournament) {
          const key = r.tournament_id!;
          if (!tournamentRows.has(key)) tournamentRows.set(key, []);
          tournamentRows.get(key)!.push(r);
        } else {
          standaloneRows.push(r);
        }
      }

      // ── Aggregate tournament rounds into single posts ──
      const tournamentPosts: FeedPost[] = [];
      for (const [, rounds] of tournamentRows) {
        const latest = rounds[0]; // already sorted by played_at DESC
        const wins = rounds.filter((r) => r.won).length;
        const losses = rounds.length - wins;
        const totalPoints = rounds.reduce((sum, r) => sum + r.team_score, 0);
        const winPct = rounds.length > 0 ? Math.round((wins / rounds.length) * 100) : 0;
        const format = latest.tournaments!.tournament_format;

        tournamentPosts.push({
          id: `tournament-${latest.tournament_id}`,
          username: displayName,
          avatarUrl,
          timeAgo: formatTimeAgo(latest.played_at),
          likes: 0,
          comments: 0,
          type: 'tournament',
          rank: 0,
          eventName: latest.tournaments!.name,
          eventVenue: FORMAT_LABELS[format] ?? format,
          format: FORMAT_LABELS[format] ?? format,
          points: totalPoints,
          record: `${wins}W-${losses}L`,
          winRate: `${winPct}%`,
          roundCount: rounds.length,
        });
      }

      // ── Build standalone (imported/manual) posts ──
      const importPosts: FeedPost[] = standaloneRows.map((r) => {
        const scoreDisplay = r.set_scores && r.set_scores.length > 0
          ? r.set_scores.map((s) => `${s.team_a}-${s.team_b}`).join(', ')
          : `${r.team_score}-${r.opponent_score}`;
        return {
          id: r.id,
          username: displayName,
          avatarUrl,
          timeAgo: formatTimeAgo(r.played_at),
          likes: 0,
          comments: 0,
          type: 'imported' as const,
          team1: r.partner_name ? `${displayName} + ${r.partner_name}` : displayName,
          team2: [r.opponent1_name, r.opponent2_name].filter(Boolean).join(' + ') || 'Opponents',
          score: scoreDisplay,
          result: (r.team_score === r.opponent_score ? 'draw' : r.won ? 'won' : 'lost') as 'won' | 'lost' | 'draw',
          source: r.source === 'playtomic' ? 'Playtomic' : r.source === 'screenshot' ? 'Screenshot' : 'Manual',
          sourceVenue: '',
        };
      });

      // ── Merge and sort by most recent, cap at 10 ──
      const allPosts = [...tournamentPosts, ...importPosts];
      // Sort by parsing timeAgo is unreliable — use original played_at from first row
      // Tournament posts use latest round's played_at, import posts use their own
      // Since both groups are already ordered, interleave by comparing timeAgo heuristically
      // Simpler: just keep the order — tournaments first (most recent), then imports
      // Actually, let's properly sort using a timestamp map
      const tsMap = new Map<string, number>();
      for (const r of rows) {
        const key = r.tournament_id && r.tournaments
          && r.source !== 'manual' && r.source !== 'playtomic' && r.source !== 'screenshot'
          ? `tournament-${r.tournament_id}`
          : r.id;
        const ts = new Date(r.played_at).getTime();
        if (!tsMap.has(key) || ts > tsMap.get(key)!) tsMap.set(key, ts);
      }
      allPosts.sort((a, b) => (tsMap.get(b.id) ?? 0) - (tsMap.get(a.id) ?? 0));

      setFeedPosts(allPosts.slice(0, 10));
    } catch {
      // Fail silently
    }
  }, [user, profile]);

  useEffect(() => {
    fetchActive();
    fetchUnreadCount();
    refreshProfile();
  }, [fetchActive, fetchUnreadCount, refreshProfile]);

  // Fetch upcoming + feed + play this week after active tournament is resolved
  useEffect(() => {
    fetchUpcoming();
    fetchFeed();
    fetchPlayThisWeek();
  }, [fetchUpcoming, fetchFeed, fetchPlayThisWeek]);

  const handleBannerPress = () => {
    if (!activeTournament) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tid = activeTournament.tournament.id;
    if (activeTournament.tournament.status === 'running') {
      router.push(`/(app)/tournament/${tid}/play`);
    } else {
      router.push(`/(app)/tournament/${tid}/lobby`);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchActive(), fetchUpcoming(), fetchPlayThisWeek(), fetchFeed(), fetchUnreadCount()]);
    setRefreshing(false);
  }, [fetchActive, fetchUpcoming, fetchFeed, fetchUnreadCount]);

  return (
    <ErrorBoundary fallbackMessage="Home couldn't load. Tap retry to try again.">
    <SafeAreaView testID="screen-home" style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.opticYellow}
            colors={[Colors.opticYellow]}
          />
        }
      >

        {/* ─── Header ─── */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <SmashdLogo size={30} />
            <SmashdWordmark size={22} />
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(app)/(tabs)/discover');
              }}
              accessibilityRole="button"
              accessibilityLabel="Search"
            >
              <Ionicons name="search-outline" size={18} color={Colors.textPrimary} />
            </Pressable>
            <Pressable
              style={styles.headerBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(app)/notifications');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Notifications${unreadNotifCount > 0 ? `, ${unreadNotifCount} unread` : ''}`}
            >
              <Ionicons name="notifications-outline" size={18} color={Colors.textPrimary} />
              {unreadNotifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifCount > 9 ? '9+' : String(unreadNotifCount)}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* ─── Live Tournament ─── */}
        {activeTournament && (
          <LiveBanner tournament={activeTournament} onPress={handleBannerPress} />
        )}

        {/* ─── Upcoming Events ─── */}
        {upcomingEvents.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
            <SectionHeader
              label="Your Upcoming Games"
              accentColor={Colors.opticYellow}
              actionLabel="See All"
              onAction={() => router.push('/(app)/(tabs)/discover')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ucScroll}
            >
              {upcomingEvents.map((e) => (
                <UpcomingCard key={e.id} event={e} />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ─── Play This Week ─── */}
        {playThisWeek.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <SectionHeader
              label="Play This Week"
              accentColor={Colors.aquaGreen}
              actionLabel="Browse All"
              onAction={() => router.push('/(app)/(tabs)/discover')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ucScroll}
            >
              {playThisWeek.map((e) => (
                <PlayThisWeekCard key={e.id} event={e} />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ─── Activity Feed ─── */}
        {feedPosts.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
            <SectionHeader
              label="Activity"
              accentColor={Colors.violet}
              actionLabel="See All"
              onAction={() => router.push('/(app)/(tabs)/stats')}
            />
            {feedPosts.map((p, index) => (
              <View key={p.id} testID={`card-tournament-${index}`}>
                <FeedPostItem post={p} />
              </View>
            ))}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
            <SectionHeader
              label="Activity"
              accentColor={Colors.violet}
              actionLabel="See All"
              onAction={() => router.push('/(app)/(tabs)/stats')}
            />
            <View testID="state-home-empty" style={styles.emptyActivity}>
              <Ionicons name="tennisball-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyActivityText}>
                No recent activity yet.{'\n'}Play a match or join a tournament to get started!
              </Text>
              <Pressable
                testID="btn-empty-browse"
                style={styles.emptyCtaBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(app)/(tabs)/discover');
                }}
              >
                <Text style={styles.emptyCtaText}>Browse Events</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

      </ScrollView>

      {/* ─── FAB ─── */}
      <Pressable
        style={styles.fabWrapper}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/(app)/tournament/create');
        }}
        accessibilityRole="button"
        accessibilityLabel="Create tournament"
      >
        <LinearGradient
          colors={['#E0FF4D' /* opticYellow lighter variant for gradient */, Colors.opticYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Text style={styles.fabPlus}>{'\uFF0B'}</Text>
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
    </ErrorBoundary>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  scroll: { paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Alpha.white06,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.darkBg,
  },
  notifBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: '#fff',
    lineHeight: 10,
  },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[4],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textDim },

  // Live Banner — no backgroundColor; LinearGradient fills it
  liveBanner: {
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[4],
    borderRadius: Radius.lg,
    padding: Spacing[4],
    paddingTop: Spacing[4] + 2,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    overflow: 'hidden',
    gap: Spacing[1],
  },
  liveBannerStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing[2],
  },
  lobbyBadge: { backgroundColor: Colors.surface },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 1,
  },
  liveBannerTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  liveBannerSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
  },
  liveMeta: { flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[2] },
  liveMetaItem: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },

  // Sections
  section: { marginBottom: Spacing[4] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[3],
  },
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
  },
  seeAll: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.opticYellow,
  },

  // Upcoming Cards
  ucScroll: { paddingHorizontal: Spacing[5], gap: Spacing[3] },
  ucCard: {
    width: 200,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.opticYellow,
  },
  ucDate: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.opticYellow,
    letterSpacing: 1,
    marginBottom: 2,
  },
  ucName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 17,
  },
  ucVenue: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing[2],
  },
  ucBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ucFormatPill: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  ucFormatText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.violetLight,
  },
  ucSpots: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.success },
  ucSpotsLow: { color: Colors.warning },
  ucSpotsFull: { color: Colors.error },

  // Play This Week — compact horizontal chips
  ptwChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: Spacing[4],
    borderWidth: 1,
    borderColor: Alpha.aqua12,
  },
  ptwChipFull: {
    opacity: 0.5,
  },
  ptwChipVenue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  ptwChipDivider: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  ptwChipTime: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.aquaGreen,
  },
  ptwChipSpots: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.warning,
  },

  // Feed Post
  feedPost: {
    backgroundColor: Colors.card,
    marginBottom: Spacing[3],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: Colors.violet,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  postUserInfo: { flex: 1 },
  postUsername: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: 2,
  },
  postBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  postBadgeText: { fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.5 },
  postTime: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },

  // Tournament Result Card — violet-tinted background
  resultCard: {
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[3],
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    borderRadius: Radius.lg,
    padding: Spacing[4],
  },
  prcPlacement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  prcRank: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32 },
  prcEvent: { flex: 1 },
  prcEventName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  prcEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: 2,
  },
  prcFormatPill: {
    backgroundColor: Alpha.yellow10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  prcFormatText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.opticYellow,
  },
  prcEventVenue: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
  prcStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Alpha.white06,
  },
  prcStat: { alignItems: 'center' },
  prcStatVal: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.opticYellow },
  prcStatLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  prcConditions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginTop: Spacing[3],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Alpha.white06,
  },
  prcConditionPill: {
    backgroundColor: Alpha.yellow08,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Alpha.yellow15,
  },
  prcConditionText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.opticYellow,
    letterSpacing: 0.5,
  },

  // Import Card
  importCard: {
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[3],
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: 14,
  },
  importRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  importTeams: { flex: 1 },
  importTeamText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  importVs: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginVertical: 2 },
  importScoreBlock: { alignItems: 'flex-end' },
  importScore: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  importResult: { fontFamily: Fonts.mono, fontSize: 12, marginTop: 2 },
  importSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Alpha.white05,
  },
  importSourcePill: {
    backgroundColor: Alpha.aqua12,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  importSourcePillText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.aquaGreen,
  },
  importSourceVenue: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },

  // Milestone Card
  milestoneCard: {
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[3],
    borderRadius: Radius.lg,
    padding: Spacing[4],
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  milestoneEmoji: { fontSize: 36, marginBottom: Spacing[2] },
  milestoneTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.gold,
    marginBottom: Spacing[1],
  },
  milestoneDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Post Actions
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
    gap: Spacing[5],
  },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  paCount: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },

  // Likes summary
  likesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[2],
  },
  likesSummaryText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },

  // Comment preview
  commentPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
  },
  commentPreviewUser: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  commentPreviewText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    flex: 1,
  },

  // FAB — shadow on wrapper, gradient on inner
  fabWrapper: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    ...Shadows.glowYellow,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fabPlus: { fontSize: 28, color: Colors.darkBg, lineHeight: 32 },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 100,
    gap: Spacing[3],
  },
  emptyActivityText: {
    color: Colors.textMuted,
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyCtaBtn: {
    marginTop: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    backgroundColor: Alpha.yellow10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Alpha.yellow20,
  },
  emptyCtaText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },
});
