import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Fonts, Spacing, Radius } from '../../../src/lib/constants';
import { Button } from '../../../src/components/ui/Button';
import { Badge } from '../../../src/components/ui/Badge';
import { Input } from '../../../src/components/ui/Input';
import { getConnectionCount } from '../../../src/services/connection-service';
import { getPlayerSuggestions } from '../../../src/services/suggestion-service';
import { PlayerSuggestionCard } from '../../../src/components/PlayerSuggestionCard';
import type { TournamentFormat, PlayerSuggestion } from '../../../src/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
type IconName = keyof typeof Ionicons.glyphMap;

type RecentTournament = {
  tournament_id: string;
  name: string;
  format: TournamentFormat;
  status: 'draft' | 'running' | 'completed';
  date: string;
  rank?: number;
  totalPoints?: number;
  playerCount: number;
};

type Insight = {
  icon: IconName;
  iconColor: string;
  value: string;
  label: string;
  detail: string;
};

type ProfileTab = 'Overview' | 'Stats' | 'Feed' | 'History';
const PROFILE_TABS: ProfileTab[] = ['Overview', 'Stats', 'Feed', 'History'];

// ── Build insights from real profile data ────────────────────────────────────
function buildInsights(profile: { preferred_position?: string | null; matches_played?: number; matches_won?: number } | null): Insight[] {
  const insights: Insight[] = [];
  if (profile?.preferred_position) {
    insights.push({
      icon: 'swap-horizontal',
      iconColor: Colors.opticYellow,
      value: profile.preferred_position === 'right' ? 'Right' : profile.preferred_position === 'left' ? 'Left' : 'Both',
      label: 'COURT SIDE',
      detail: 'Preferred side',
    });
  }
  const played = profile?.matches_played ?? 0;
  const won = profile?.matches_won ?? 0;
  if (played > 0) {
    const wr = Math.round((won / played) * 100);
    insights.push({
      icon: 'trending-up',
      iconColor: Colors.aquaGreen,
      value: `${wr}%`,
      label: 'WIN RATE',
      detail: `${won}W / ${played - won}L`,
    });
  }
  if (played >= 5) {
    insights.push({
      icon: 'game-controller',
      iconColor: Colors.violetLight,
      value: String(played),
      label: 'GAMES',
      detail: 'Total played',
    });
  }
  return insights;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function XPBar({
  current,
  max,
  level,
}: {
  current: number;
  max: number;
  level: number;
}) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <View style={styles.xpContainer}>
      <View style={styles.xpHeader}>
        <Text style={styles.xpLevel}>Level {level}</Text>
        <Text style={styles.xpNext}>Next: {max.toLocaleString()} XP</Text>
      </View>
      <View style={styles.xpTrack}>
        <LinearGradient
          colors={[Colors.aquaGreen, Colors.opticYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.xpFill, { width: `${pct}%` as any }]}
        />
      </View>
      <View style={styles.xpNumbers}>
        <Text style={styles.xpNum}>{current.toLocaleString()}</Text>
        <Text style={styles.xpNum}>{max.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const PROFILE_TAB_TEST_IDS: Record<ProfileTab, string> = {
  Overview: 'tab-profile-overview',
  Stats: 'tab-profile-stats',
  Feed: 'tab-profile-feed',
  History: 'tab-profile-history',
};

function TabSwitcher({
  active,
  onSelect,
}: {
  active: ProfileTab;
  onSelect: (t: ProfileTab) => void;
}) {
  return (
    <View style={styles.tabRow}>
      {PROFILE_TABS.map((tab) => (
        <Pressable
          key={tab}
          testID={PROFILE_TAB_TEST_IDS[tab]}
          style={[styles.tab, tab === active && styles.tabActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(tab);
          }}
        >
          <Text style={[styles.tabLabel, tab === active && styles.tabLabelActive]}>
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <View style={styles.insightCard}>
      <Ionicons name={insight.icon} size={22} color={insight.iconColor} />
      <Text style={[styles.insightValue, { color: insight.iconColor }]}>
        {insight.value}
      </Text>
      <Text style={styles.insightLabel}>{insight.label}</Text>
      <Text style={styles.insightDetail}>{insight.detail}</Text>
    </View>
  );
}

function EmptyTab({ title }: { title: string }) {
  return (
    <View testID="state-profile-empty" style={styles.emptyTab}>
      <Ionicons name="construct-outline" size={36} color={Colors.textMuted} />
      <Text style={styles.emptyTabTitle}>{title} coming soon</Text>
      <Text style={styles.emptyTabDesc}>We're working on this feature.</Text>
    </View>
  );
}

// ── Module-level utilities ───────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Stats mock data removed — StatsTab now shows a redirect to the real Stats screen

// ── Stats Tab Sub-components ─────────────────────────────────────────────────

function BreakdownRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <View style={styles.breakdownTrack}>
        <View style={[styles.breakdownFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.breakdownPct, { color }]}>{pct}%</Text>
    </View>
  );
}

function StatsTab() {
  return (
    <Pressable
      style={styles.statSection}
      onPress={() => router.push('/(app)/(tabs)/stats')}
    >
      <View style={{ alignItems: 'center', paddingVertical: Spacing[8], gap: Spacing[3] }}>
        <Ionicons name="stats-chart" size={40} color={Colors.opticYellow} />
        <Text style={[styles.statSectionTitle, { textAlign: 'center' }]}>
          VIEW FULL STATS DASHBOARD
        </Text>
        <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: Colors.textDim, textAlign: 'center' }}>
          Detailed breakdowns by court side, conditions, partners, rivals, and more
        </Text>
      </View>
    </Pressable>
  );
}

// ── Feed Tab ─────────────────────────────────────────────────────────────────

function FeedTab({ tournaments }: { tournaments: RecentTournament[] }) {
  if (tournaments.length === 0) return <EmptyTab title="Activity Feed" />;
  return (
    <View style={styles.feedList}>
      {tournaments.map((t) => (
        <View key={t.tournament_id} style={styles.feedCard}>
          <View style={styles.feedHeader}>
            <View style={styles.feedAvatar}>
              <Text style={styles.feedAvatarText}>ME</Text>
            </View>
            <View style={styles.feedMeta}>
              <Text style={styles.feedAuthor}>You</Text>
              <Text style={styles.feedTime}>{fmtDate(t.date)} · {t.name}</Text>
            </View>
          </View>
          <Text style={styles.feedBody}>
            {t.rank != null
              ? `Finished #${t.rank} of ${t.playerCount} at ${t.name}`
              : `Played in ${t.name} with ${t.playerCount} players`}
          </Text>
          <View style={styles.resultStrip}>
            {t.rank != null && (
              <View style={[styles.resultChip, styles.resultChipGold]}>
                <Text style={[styles.resultChipText, { color: Colors.gold }]}>#{t.rank} Place</Text>
              </View>
            )}
            <View style={[styles.resultChip, styles.resultChipYellow]}>
              <Text style={[styles.resultChipText, { color: Colors.opticYellow }]}>
                {t.totalPoints ?? 0} pts
              </Text>
            </View>
            <View style={[styles.resultChip, styles.resultChipAqua]}>
              <Text style={[styles.resultChipText, { color: Colors.aquaGreen }]}>{t.playerCount} players</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── History Tab ──────────────────────────────────────────────────────────────

type HistoryFilter = 'All' | 'Americano' | 'Private' | 'Imported';

function HistoryTab({ tournaments }: { tournaments: RecentTournament[] }) {
  const [filter, setFilter] = useState<HistoryFilter>('All');
  const filtered =
    filter === 'All'
      ? tournaments
      : filter === 'Americano'
        ? tournaments.filter((t) =>
            ['americano', 'mexicano', 'team_americano', 'mixicano'].includes(t.format),
          )
        : [];

  const chips: { id: HistoryFilter; label: string }[] = [
    { id: 'All', label: `All (${tournaments.length})` },
    { id: 'Americano', label: 'Americano' },
    { id: 'Private', label: 'Private' },
    { id: 'Imported', label: 'Imported' },
  ];

  if (tournaments.length === 0) return (
    <View>
      <Pressable
        style={styles.importMatchButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(app)/import-matches');
        }}
      >
        <Ionicons name="camera-outline" size={18} color={Colors.aquaGreen} />
        <Text style={styles.importMatchText}>Import Match from Screenshot</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.textDim} />
      </Pressable>
      <EmptyTab title="Match History" />
    </View>
  );
  return (
    <View>
      <Pressable
        style={styles.importMatchButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(app)/import-matches');
        }}
      >
        <Ionicons name="camera-outline" size={18} color={Colors.aquaGreen} />
        <Text style={styles.importMatchText}>Import Match from Screenshot</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.textDim} />
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        {chips.map((chip) => (
          <Pressable
            key={chip.id}
            style={[styles.filterChip, filter === chip.id && styles.filterChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(chip.id);
            }}
          >
            <Text style={[styles.filterChipText, filter === chip.id && styles.filterChipTextActive]}>
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {filtered.length === 0 ? (
        <EmptyTab title={`No ${filter} history yet`} />
      ) : (
        <View style={styles.historyList}>
          {filtered.map((t) => (
            <View key={t.tournament_id} style={styles.historyCard}>
              <View style={styles.matchTypeBadge}>
                <Text style={styles.matchTypeText}>
                  {t.format.toUpperCase().replace('_', ' ')}
                </Text>
              </View>
              <View style={styles.historyCardInner}>
                <View style={styles.historyRankBadge}>
                  <Text style={styles.historyRankText}>#{t.rank ?? '—'}</Text>
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.historyMeta}>
                    {t.totalPoints ?? 0} pts · {t.playerCount} players · {fmtDate(t.date)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const { profile, user, signOut, refreshProfile } = useAuth();

  // Edit state
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [preferredPosition, setPreferredPosition] = useState<
    'left' | 'right' | 'both' | null
  >(profile?.preferred_position ?? null);
  const [racketBrand, setRacketBrand] = useState(profile?.racket_brand ?? '');
  const [racketModel, setRacketModel] = useState(profile?.racket_model ?? '');
  const [shoeBrand, setShoeBrand] = useState(profile?.shoe_brand ?? '');
  const [shoeModel, setShoeModel] = useState(profile?.shoe_model ?? '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>('Overview');

  // Extra profile data
  const [connectionCount, setConnectionCount] = useState(0);
  const [recentTournaments, setRecentTournaments] = useState<RecentTournament[]>(
    [],
  );
  const [tournamentCount, setTournamentCount] = useState(0);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  // ── Data Fetching ──────────────────────────────────────────────────────

  const fetchExtraData = useCallback(async () => {
    if (!user) return;

    try {
      const [countResult, historyResult, pointsResult, suggestionsResult] =
        await Promise.all([
          getConnectionCount(user.id).catch(() => 0),
          supabase
            .from('tournament_players')
            .select(
              `
            tournament_id,
            tournaments (
              id, name, tournament_format, status, created_at
            )
          `,
            )
            .eq('player_id', user.id)
            .eq('tournament_status', 'active')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('player_match_results')
            .select('tournament_id')
            .eq('player_id', user.id)
            .not('tournament_id', 'is', null),
          getPlayerSuggestions(8).catch(() => [] as PlayerSuggestion[]),
        ]);

      setConnectionCount(countResult);
      setSuggestions(suggestionsResult);

      if (!historyResult.error && historyResult.data) {
        const filtered = (historyResult.data as any[]).filter((r) => r.tournaments);
        const tournamentIds = filtered.map((r) => r.tournament_id);

        // Batch-fetch player match results for points & rank calculation
        const { data: allResults } = tournamentIds.length > 0
          ? await supabase
              .from('player_match_results')
              .select('tournament_id, player_id, team_score')
              .in('tournament_id', tournamentIds)
          : { data: [] };

        // Build per-tournament leaderboard: { tournamentId -> { playerId -> totalPoints } }
        const tournamentScores = new Map<string, Map<string, number>>();
        for (const row of (allResults ?? []) as { tournament_id: string; player_id: string; team_score: number }[]) {
          if (!tournamentScores.has(row.tournament_id)) {
            tournamentScores.set(row.tournament_id, new Map());
          }
          const playerMap = tournamentScores.get(row.tournament_id)!;
          playerMap.set(row.player_id, (playerMap.get(row.player_id) ?? 0) + (row.team_score ?? 0));
        }

        const items: RecentTournament[] = await Promise.all(
          filtered.map(async (r) => {
            const { count } = await supabase
              .from('tournament_players')
              .select('id', { count: 'exact', head: true })
              .eq('tournament_id', r.tournament_id)
              .eq('tournament_status', 'active');

            // Calculate points and rank for this user in this tournament
            const playerMap = tournamentScores.get(r.tournament_id);
            const myPoints = playerMap?.get(user!.id) ?? 0;
            let rank: number | undefined;
            if (playerMap && playerMap.size > 0) {
              const sorted = Array.from(playerMap.entries()).sort((a, b) => b[1] - a[1]);
              const idx = sorted.findIndex(([pid]) => pid === user!.id);
              if (idx !== -1) rank = idx + 1;
            }

            return {
              tournament_id: r.tournament_id,
              name: r.tournaments.name,
              format: r.tournaments.tournament_format,
              status: r.tournaments.status,
              date: r.tournaments.created_at,
              playerCount: count ?? 0,
              totalPoints: myPoints,
              rank,
            };
          }),
        );
        setRecentTournaments(items);
      }

      if (!pointsResult.error && pointsResult.data) {
        const uniqueTournaments = new Set(
          (pointsResult.data as any[]).map((r) => r.tournament_id).filter(Boolean),
        );
        setTournamentCount(uniqueTournaments.size);
      }
    } catch {
      // Non-critical — profile still renders
    } finally {
      setLoadingExtra(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExtraData();
  }, [fetchExtraData]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), fetchExtraData()]);
    setRefreshing(false);
  }, [refreshProfile, fetchExtraData]);

  const handleEdit = () => {
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
    setPreferredPosition(profile?.preferred_position ?? null);
    setRacketBrand(profile?.racket_brand ?? '');
    setRacketModel(profile?.racket_model ?? '');
    setShoeBrand(profile?.shoe_brand ?? '');
    setShoeModel(profile?.shoe_model ?? '');
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          preferred_position: preferredPosition,
          racket_brand: racketBrand.trim() || null,
          racket_model: racketModel.trim() || null,
          shoe_brand: shoeBrand.trim() || null,
          shoe_model: shoeModel.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleTournamentPress = (t: RecentTournament) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (t.status === 'completed') {
      router.push(`/(app)/tournament/${t.tournament_id}/results`);
    } else if (t.status === 'running') {
      router.push(`/(app)/tournament/${t.tournament_id}/play`);
    } else {
      router.push(`/(app)/tournament/${t.tournament_id}/lobby`);
    }
  };

  const handleSuggestionConnected = (userId: string) => {
    setTimeout(() => {
      setSuggestions((prev) => prev.filter((s) => s.user_id !== userId));
      setConnectionCount((prev) => prev + 1);
    }, 1500);
  };

  // ── Derived Values ─────────────────────────────────────────────────────

  const winRate =
    profile?.matches_played && profile.matches_played > 0
      ? Math.round(
          ((profile.matches_won ?? 0) / profile.matches_played) * 100,
        )
      : null;

  const initials = (profile?.display_name ?? user?.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasAvatar = !!profile?.game_face_url;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatLabel = (format: TournamentFormat) => {
    const labels: Record<TournamentFormat, string> = {
      americano: 'Americano',
      mexicano: 'Mexicano',
      team_americano: 'Team',
      mixicano: 'Mixicano',
    };
    return labels[format] ?? format;
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView testID="screen-profile" style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.opticYellow}
            />
          }
        >
          {/* ── Cover & Profile Header ────────────────────────────────── */}
          <View style={styles.coverArea}>
            <LinearGradient
              colors={['rgba(124,58,237,0.30)', 'rgba(204,255,0,0.10)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverGradient}
            />

            {/* Action Buttons */}
            <View style={styles.headerActions}>
              <Pressable
                testID="btn-settings"
                style={styles.actionCircle}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(app)/settings');
                }}
                hitSlop={8}
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
              </Pressable>
              <Pressable
                style={styles.actionCircle}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleEdit();
                }}
                hitSlop={8}
              >
                <Ionicons
                  name="pencil"
                  size={16}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Avatar */}
            <View style={styles.avatarOuter}>
              {hasAvatar ? (
                <Image
                  source={{ uri: profile!.game_face_url! }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              {profile?.preferred_position && (
                <View style={styles.positionBadge}>
                  <Text style={styles.positionBadgeText}>
                    {profile.preferred_position.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Name & Handle */}
            <Text style={styles.displayName}>
              {profile?.display_name ??
                user?.email?.split('@')[0] ??
                'Player'}
            </Text>
            {(profile?.username || profile?.bio) && (
              <Text style={styles.handle}>
                {profile?.username ? `@${profile.username}` : ''}
                {profile?.username && profile?.bio ? ' · ' : ''}
                {profile?.bio ?? ''}
              </Text>
            )}

            {/* Profile Meta */}
            <View style={styles.profileMeta}>
              <View style={styles.metaChip}>
                <Ionicons
                  name="calendar-outline"
                  size={11}
                  color={Colors.textMuted}
                />
                <Text style={styles.metaChipText}>
                  Joined{' '}
                  {(profile as any)?.created_at
                    ? formatDate((profile as any).created_at)
                    : 'Recently'}
                </Text>
              </View>
              <View style={styles.metaSep} />
              <View style={styles.metaChip}>
                <Ionicons
                  name="trophy-outline"
                  size={11}
                  color={Colors.textMuted}
                />
                <Text style={styles.metaChipText}>
                  {recentTournaments.length} tournaments
                </Text>
              </View>
              <View style={styles.metaSep} />
              <Pressable
                style={styles.metaChip}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(app)/connections');
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={11}
                  color={Colors.textMuted}
                />
                <Text style={styles.metaChipText}>
                  {connectionCount} connections
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Edit Mode ─────────────────────────────────────────────── */}
          {editing && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.editOverlay}
            >
              <View style={styles.editCard}>
                <Text style={styles.editTitle}>Edit Profile</Text>
                <Input
                  label="DISPLAY NAME"
                  placeholder="Your name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
                <Input
                  label="BIO"
                  placeholder="Tell us about your game..."
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.posSection}>
                  <Text style={styles.posLabel}>PREFERRED SIDE</Text>
                  <View style={styles.posRow}>
                    {(['left', 'right', 'both'] as const).map((pos) => (
                      <Pressable
                        key={pos}
                        style={[
                          styles.posChip,
                          preferredPosition === pos && styles.posChipActive,
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setPreferredPosition(pos);
                        }}
                      >
                        <Text
                          style={[
                            styles.posChipText,
                            preferredPosition === pos &&
                              styles.posChipTextActive,
                          ]}
                        >
                          {pos.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Equipment */}
                <View style={styles.posSection}>
                  <Text style={styles.posLabel}>MY EQUIPMENT</Text>
                  <View style={styles.equipRow}>
                    <View style={styles.equipField}>
                      <Input
                        label="RACKET BRAND"
                        placeholder="e.g. Bullpadel"
                        value={racketBrand}
                        onChangeText={setRacketBrand}
                        autoCapitalize="words"
                      />
                    </View>
                    <View style={styles.equipField}>
                      <Input
                        label="RACKET MODEL"
                        placeholder="e.g. Vertex 03"
                        value={racketModel}
                        onChangeText={setRacketModel}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={styles.equipRow}>
                    <View style={styles.equipField}>
                      <Input
                        label="SHOE BRAND"
                        placeholder="e.g. Asics"
                        value={shoeBrand}
                        onChangeText={setShoeBrand}
                        autoCapitalize="words"
                      />
                    </View>
                    <View style={styles.equipField}>
                      <Input
                        label="SHOE MODEL"
                        placeholder="e.g. Gel-Padel Pro 5"
                        value={shoeModel}
                        onChangeText={setShoeModel}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.editActions}>
                  <Button
                    title="CANCEL"
                    onPress={handleCancel}
                    variant="outline"
                    size="md"
                  />
                  <Button
                    title="SAVE"
                    onPress={handleSave}
                    loading={saving}
                    variant="primary"
                    size="md"
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {/* ── Stat Cards ────────────────────────────────────────────── */}
          {!editing && (
            <View style={styles.statsGrid}>
              <StatCard
                value={profile?.matches_played ?? 0}
                label="MATCHES"
                color={Colors.opticYellow}
              />
              <StatCard
                value={winRate !== null ? `${winRate}%` : '—'}
                label="WIN RATE"
                color={Colors.aquaGreen}
              />
              <StatCard
                value={tournamentCount}
                label="TOURNAMENTS"
                color={Colors.violetLight}
              />
              <View style={styles.statCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="flame" size={16} color={Colors.warning} />
                  <Text style={[styles.statValue, { color: Colors.warning }]}>
                    {profile?.matches_played ? profile.matches_played : '—'}
                  </Text>
                </View>
                <Text style={styles.statLabel}>GAMES</Text>
              </View>
            </View>
          )}

          {/* ── XP Bar ────────────────────────────────────────────────── */}
          {!editing && <XPBar current={2450} max={3000} level={12} />}

          {/* ── Tab Switcher ──────────────────────────────────────────── */}
          {!editing && (
            <TabSwitcher active={activeTab} onSelect={setActiveTab} />
          )}

          {/* ── Overview Tab ──────────────────────────────────────────── */}
          {!editing && activeTab === 'Overview' && (
            <Animated.View
              key="overview"
              entering={FadeIn.duration(200)}
              style={styles.tabContent}
            >
              {/* Insights */}
              {buildInsights(profile).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitlePadded}>INSIGHTS</Text>
                <FlatList
                  data={buildInsights(profile)}
                  keyExtractor={(_, i) => `insight-${i}`}
                  renderItem={({ item }) => <InsightCard insight={item} />}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hScroll}
                  ItemSeparatorComponent={() => (
                    <View style={{ width: 10 }} />
                  )}
                />
              </View>
              )}

              {/* Equipment */}
              {!editing && (profile?.racket_brand || profile?.shoe_brand) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitlePadded}>MY EQUIPMENT</Text>
                  <View style={styles.equipDisplayRow}>
                    {profile?.racket_brand && (
                      <View style={styles.equipDisplayCard}>
                        <Ionicons name="tennisball-outline" size={20} color={Colors.opticYellow} />
                        <View style={styles.equipDisplayInfo}>
                          <Text style={styles.equipDisplayBrand}>{profile.racket_brand}</Text>
                          {profile.racket_model && (
                            <Text style={styles.equipDisplayModel}>{profile.racket_model}</Text>
                          )}
                        </View>
                      </View>
                    )}
                    {profile?.shoe_brand && (
                      <View style={styles.equipDisplayCard}>
                        <Ionicons name="footsteps-outline" size={20} color={Colors.aquaGreen} />
                        <View style={styles.equipDisplayInfo}>
                          <Text style={styles.equipDisplayBrand}>{profile.shoe_brand}</Text>
                          {profile.shoe_model && (
                            <Text style={styles.equipDisplayModel}>{profile.shoe_model}</Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Partners */}
              {suggestions.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>FREQUENT PARTNERS</Text>
                    <Text style={styles.sectionCount}>
                      {suggestions.length}
                    </Text>
                  </View>
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.user_id}
                    renderItem={({ item }) => (
                      <PlayerSuggestionCard
                        suggestion={item}
                        onConnected={handleSuggestionConnected}
                      />
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hScroll}
                    ItemSeparatorComponent={() => (
                      <View style={{ width: 10 }} />
                    )}
                  />
                </View>
              )}

              {/* Recent Tournaments */}
              {recentTournaments.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>RECENT TOURNAMENTS</Text>
                    <Pressable
                      onPress={() => router.push('/(app)/(tabs)/stats')}
                      hitSlop={8}
                    >
                      <Text style={styles.seeAll}>See all</Text>
                    </Pressable>
                  </View>
                  {recentTournaments.map((t, i) => (
                    <Pressable
                      key={t.tournament_id}
                      onPress={() => handleTournamentPress(t)}
                      style={({ pressed }) => [
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <View style={styles.tCard}>
                        <View
                          style={[
                            styles.rankBadge,
                            i === 0 && styles.rankGold,
                            i === 1 && styles.rankSilver,
                            i === 2 && styles.rankBronze,
                            i > 2 && styles.rankOther,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rankNum,
                              i <= 2 && styles.rankNumBright,
                            ]}
                          >
                            {i + 1}
                          </Text>
                        </View>
                        <View style={styles.tInfo}>
                          <Text style={styles.tName} numberOfLines={1}>
                            {t.name}
                          </Text>
                          <Text style={styles.tMeta}>
                            {formatLabel(t.format)} · {t.playerCount} players ·{' '}
                            {formatDate(t.date)}
                          </Text>
                        </View>
                        <Badge
                          label={t.status.toUpperCase()}
                          variant={
                            t.status === 'completed'
                              ? 'success'
                              : t.status === 'running'
                                ? 'info'
                                : 'default'
                          }
                        />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {/* ── Other Tabs (placeholder) ──────────────────────────────── */}
          {!editing && activeTab === 'Stats' && (
            <Animated.View
              key="stats"
              entering={FadeIn.duration(200)}
              style={styles.tabContent}
            >
              <StatsTab />
            </Animated.View>
          )}
          {!editing && activeTab === 'Feed' && (
            <Animated.View
              key="feed"
              entering={FadeIn.duration(200)}
              style={styles.tabContent}
            >
              <FeedTab tournaments={recentTournaments} />
            </Animated.View>
          )}
          {!editing && activeTab === 'History' && (
            <Animated.View
              key="history"
              entering={FadeIn.duration(200)}
              style={styles.tabContent}
            >
              <HistoryTab tournaments={recentTournaments} />
            </Animated.View>
          )}

          {/* ── Import Match History ────────────────────────────────── */}
          {!editing && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(app)/import-matches');
              }}
              style={styles.importMatchesBtn}
            >
              <View style={styles.importMatchesIconWrap}>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.opticYellow} />
              </View>
              <View style={styles.importMatchesContent}>
                <Text style={styles.importMatchesTitle}>Import Match History</Text>
                <Text style={styles.importMatchesDesc}>
                  Screenshot your results from Nettla, Playtomic, or other apps
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
            </Pressable>
          )}

          {/* ── Sign Out ──────────────────────────────────────────────── */}
          {!editing && (
            <Pressable
              onPress={handleSignOut}
              style={styles.signOutBtn}
              hitSlop={8}
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color={Colors.textMuted}
              />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── FAB ───────────────────────────────────────────────────── */}
      {!editing && (
        <Pressable
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(app)/tournament/create' as any);
          }}
        >
          <Ionicons name="add" size={28} color={Colors.darkBg} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  scrollContent: {
    paddingBottom: Spacing[10],
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.opticYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 10,
  },

  // ── Cover & Header ────────────────────────────
  coverArea: {
    alignItems: 'center',
    paddingBottom: Spacing[4],
    position: 'relative',
  },
  coverGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    width: '100%',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    marginBottom: Spacing[4],
  },
  actionCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Avatar ──
  avatarOuter: {
    position: 'relative',
    marginBottom: Spacing[3],
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Colors.opticYellow,
    shadowColor: Colors.opticYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.opticYellow,
    shadowColor: Colors.opticYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarText: {
    fontFamily: Fonts.mono,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  positionBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  positionBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.aquaGreen,
    letterSpacing: 0.5,
  },

  // ── Identity ──
  displayName: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  handle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing[8],
    marginBottom: Spacing[2],
  },

  // ── Level Badge ──
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 207, 193, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 207, 193, 0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: Spacing[3],
  },
  levelText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.aquaGreen,
    letterSpacing: 0.5,
  },

  // ── Profile Meta ──
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  },

  // ── Stat Cards ──
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing[5],
    marginTop: Spacing[5],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
  },
  statLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  // ── XP Bar ──
  xpContainer: {
    marginHorizontal: Spacing[5],
    marginTop: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[4],
    gap: 8,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLevel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  xpNext: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  xpTrack: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpNum: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
  },

  // ── Tabs ──
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing[5],
    marginTop: Spacing[5],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md - 2,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.surface,
  },
  tabLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.opticYellow,
  },

  // ── Tab Content ──
  tabContent: {
    marginTop: Spacing[5],
  },

  // ── Sections ──
  section: {
    gap: 10,
    marginBottom: Spacing[5],
  },
  sectionTitlePadded: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    paddingHorizontal: Spacing[5],
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
  },
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  sectionCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  seeAll: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.opticYellow,
  },
  hScroll: {
    paddingHorizontal: Spacing[5],
    paddingVertical: 2,
  },

  // ── Insight Card ──
  insightCard: {
    width: 140,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[3],
    gap: 4,
  },
  insightValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    marginTop: 4,
  },
  insightLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  insightDetail: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textDim,
  },

  // ── Tournament Card ──
  tCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[3],
    marginHorizontal: Spacing[5],
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankGold: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  rankSilver: {
    backgroundColor: 'rgba(192, 192, 192, 0.15)',
  },
  rankBronze: {
    backgroundColor: 'rgba(205, 127, 50, 0.15)',
  },
  rankOther: {
    backgroundColor: Colors.surface,
  },
  rankNum: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.textDim,
  },
  rankNumBright: {
    color: Colors.textPrimary,
  },
  tInfo: {
    flex: 1,
    gap: 2,
  },
  tName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  tMeta: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
  },

  // ── Edit Form ──
  editOverlay: {
    paddingHorizontal: Spacing[5],
    marginTop: Spacing[3],
  },
  editCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[5],
    gap: 16,
  },
  editTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  posSection: {
    gap: 8,
  },
  posLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  posRow: {
    flexDirection: 'row',
    gap: 8,
  },
  posChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  posChipActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
  },
  posChipText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
  posChipTextActive: {
    color: Colors.opticYellow,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },

  // ── Equipment (edit form) ──
  equipRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  equipField: {
    flex: 1,
  },

  // ── Equipment (display) ──
  equipDisplayRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    paddingHorizontal: Spacing[5],
  },
  equipDisplayCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  equipDisplayInfo: {
    flex: 1,
    gap: 2,
  },
  equipDisplayBrand: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  equipDisplayModel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },

  // ── Empty Tab ──
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[16],
  },
  emptyTabTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  emptyTabDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },

  // ── Import Matches ──
  importMatchesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginTop: Spacing[6],
    borderWidth: 1,
    borderColor: 'rgba(204,255,0,0.15)',
  },
  importMatchesIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(204,255,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importMatchesContent: {
    flex: 1,
    gap: 2,
  },
  importMatchesTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  importMatchesDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 16,
  },

  // ── Sign Out ──
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing[8],
  },
  signOutText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },

  // ── Stats Tab ──
  statSection: {
    marginBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
  },
  statSectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: Spacing[2],
  },
  barChartCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[4],
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 56,
    gap: 3,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 6,
  },
  barWin: {
    backgroundColor: Colors.success,
  },
  barLoss: {
    backgroundColor: Colors.error,
  },
  barLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: Spacing[3],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  breakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[4],
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    width: 80,
  },
  breakdownTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownPct: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    width: 38,
    textAlign: 'right',
  },
  weatherGrid: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[4],
    gap: 12,
  },
  weatherRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weatherCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 4,
  },
  weatherIcon: {
    fontSize: 20,
  },
  weatherPct: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  weatherLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
  },

  // ── Feed Tab ──
  feedList: {
    paddingHorizontal: Spacing[5],
    gap: 12,
  },
  feedCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[4],
    gap: 10,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.opticYellow,
    letterSpacing: 0.5,
  },
  feedMeta: {
    flex: 1,
    gap: 2,
  },
  feedAuthor: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  feedTime: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  feedBody: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  resultStrip: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  resultChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  resultChipGold: {
    backgroundColor: 'rgba(255, 215, 0, 0.10)',
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  resultChipYellow: {
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
    borderColor: 'rgba(204, 255, 0, 0.20)',
  },
  resultChipAqua: {
    backgroundColor: 'rgba(0, 207, 193, 0.08)',
    borderColor: 'rgba(0, 207, 193, 0.20)',
  },
  resultChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
  },

  // ── History Tab ──
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[4],
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterChipActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
  },
  filterChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.opticYellow,
  },
  historyList: {
    paddingHorizontal: Spacing[5],
    gap: 10,
  },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    overflow: 'hidden',
  },
  matchTypeBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[4],
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  matchTypeText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.aquaGreen,
    letterSpacing: 1,
  },
  historyCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing[3],
  },
  historyRankBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRankText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },
  historyInfo: {
    flex: 1,
    gap: 3,
  },
  historyName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  historyMeta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },

  // ── Import Match Button ──
  importMatchButton: {
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
    marginBottom: Spacing[4],
  },
  importMatchText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.aquaGreen,
  },
});
