import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, {
  Circle,
  Polyline,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import { useAuth } from '../../../src/providers/AuthProvider';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../../src/lib/constants';
import { ListSkeleton } from '../../../src/components/ui/Skeleton';
import { AnimatedPressable, useSpringPress } from '../../../src/hooks/useSpringPress';
import {
  fetchPlayerStats,
  fetchPlatformRatings,
  fetchMatchHistory,
  type PlayerStats,
  type Period,
  type MatchTypeFilter,
  type FormResult,
  type PartnerStat,
  type RivalStat,
  type FormatBreakdown,
  type RatingPoint,
  type MatchHistoryItem,
  updateMatchDetails,
} from '../../../src/services/stats-service';
import { RatingProgressionChart, WinRateTrendChart, MatchHistoryFeed } from '../../../src/components/StatsCharts';

// ─── Types ───────────────────────────────────────────────────────────────────
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Partner avatar colours (cycled)
const PARTNER_COLORS = [Colors.aquaGreen, Colors.violet, Colors.coral, Colors.opticYellow, Colors.gold];

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Period selector tabs */
function PeriodTabs({ active, onChange }: { active: Period; onChange: (p: Period) => void }) {
  const periods: Period[] = ['Week', 'Month', 'Season', 'All Time'];
  return (
    <View style={styles.periodTabs}>
      {periods.map((p) => (
        <Pressable
          key={p}
          style={[styles.periodTab, active === p && styles.periodTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(p);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: active === p }}
          accessibilityLabel={`${p} period`}
        >
          <Text style={[styles.periodTabText, active === p && styles.periodTabTextActive]}>
            {p}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Match type filter tabs */
function MatchTypeTabs({ active, onChange }: { active: MatchTypeFilter; onChange: (f: MatchTypeFilter) => void }) {
  const filters: { key: MatchTypeFilter; label: string; icon: IconName }[] = [
    { key: 'all', label: 'All', icon: 'grid-outline' },
    { key: 'competitive', label: 'Competitive', icon: 'trophy-outline' },
    { key: 'friendly', label: 'Friendly', icon: 'happy-outline' },
    { key: 'tournament', label: 'Tournament', icon: 'podium-outline' },
  ];
  return (
    <View style={styles.matchTypeTabs}>
      {filters.map((f) => (
        <Pressable
          key={f.key}
          style={[styles.matchTypeTab, active === f.key && styles.matchTypeTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(f.key);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: active === f.key }}
        >
          <Ionicons
            name={f.icon}
            size={13}
            color={active === f.key ? Colors.darkBg : Colors.textMuted}
          />
          <Text style={[styles.matchTypeTabText, active === f.key && styles.matchTypeTabTextActive]}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** SVG Level Ring with progress arc */
function LevelRing({ level, progress }: { level: string; progress: number }) {
  const size = 72;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filledArc = circumference * progress;

  return (
    <View style={styles.levelRingContainer}>
      <Svg width={size} height={size} style={styles.levelRingSvg}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surfaceLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.opticYellow}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${filledArc} ${circumference - filledArc}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.levelInner}>
        <Text style={styles.levelValue}>{level}</Text>
        <Text style={styles.levelLabel}>LEVEL</Text>
      </View>
    </View>
  );
}

/** Hero card with gradient background, level ring and key stats */
function HeroCard({
  name,
  level,
  matchesPlayed,
  winRate,
  tournamentCount,
  streak,
  playingSince,
}: {
  name: string;
  level: number;
  matchesPlayed: number;
  winRate: number;
  tournamentCount: number;
  streak: { type: string; count: number };
  playingSince: string;
}) {
  const levelStr = level.toFixed(1);
  const levelProgress = level > 0 ? (level % 1) || 1.0 : 0;
  const createdDate = new Date(playingSince);
  const monthsDiff = Math.max(1, Math.round((Date.now() - createdDate.getTime()) / (30 * 86_400_000)));
  const sinceMonth = createdDate.toLocaleString('en', { month: 'short', year: 'numeric' });
  const streakLabel = streak.count > 0 ? `${streak.type}${streak.count}` : '-';

  return (
    <View style={styles.heroCardOuter}>
      {/* Hero card gradient — deep purple tints */}
      <LinearGradient
        colors={['#1A1328', '#2D2440']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.heroCard}
      >
        {/* Glow overlay (top-right) */}
        <View style={styles.heroGlow} />

        {/* Top row: level ring + info */}
        <View style={styles.heroTop}>
          <LevelRing level={levelStr} progress={levelProgress} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{name}</Text>
            <Text style={styles.heroSub}>
              Playing since {sinceMonth} · {monthsDiff} month{monthsDiff !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { color: Colors.opticYellow }]}>{matchesPlayed}</Text>
            <Text style={styles.heroStatLbl}>GAMES</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { color: Colors.aquaGreen }]}>{winRate}%</Text>
            <Text style={styles.heroStatLbl}>WIN RATE</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { color: Colors.gold }]}>{tournamentCount}</Text>
            <View style={styles.heroStatLblRow}>
              <Ionicons name="trophy" size={11} color={Colors.textMuted} />
              <Text style={styles.heroStatLbl}>TOURNAMENTS</Text>
            </View>
          </View>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { color: Colors.success }]}>{streakLabel}</Text>
            <Text style={styles.heroStatLbl}>STREAK</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/** Recent form strip */
function FormStrip({ form }: { form: FormResult[] }) {
  const colors: Record<FormResult, { bg: string; text: string; border: string }> = {
    W: { bg: 'rgba(34,197,94,0.12)', text: Colors.success, border: 'rgba(34,197,94,0.25)' },
    L: { bg: 'rgba(239,68,68,0.12)', text: Colors.error, border: 'rgba(239,68,68,0.25)' },
    D: { bg: 'rgba(251,146,60,0.12)', text: Colors.warning, border: 'rgba(251,146,60,0.25)' },
  };
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Form</Text>
        <Text style={styles.sectionSubtitle}>Last {form.length} matches</Text>
      </View>
      <View style={styles.formStrip}>
        {form.map((r, i) => (
          <View
            key={i}
            style={[
              styles.formDot,
              {
                backgroundColor: colors[r].bg,
                borderColor: colors[r].border,
              },
            ]}
          >
            <Text style={[styles.formDotText, { color: colors[r].text }]}>{r}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Highlighted text inside insight */
function Hl({ children }: { children: React.ReactNode }) {
  return <Text style={styles.insightHighlight}>{children}</Text>;
}

/** AI insight card */
function InsightCard({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightIconWrap}>
        <Ionicons name={icon} size={18} color={Colors.opticYellow} />
      </View>
      <Text style={styles.insightText}>{children}</Text>
    </View>
  );
}

/** Dynamic insight based on real stats */
function StatsInsight({ stats }: { stats: PlayerStats }) {
  if (stats.currentStreak.count >= 3 && stats.currentStreak.type === 'W') {
    return (
      <InsightCard icon="flash-outline">
        You've won <Hl>{stats.currentStreak.count} in a row</Hl> — your best form yet.
        Keep this up and the level will keep climbing.
      </InsightCard>
    );
  }
  if (stats.partners.length > 0) {
    const best = stats.partners.reduce((a, b) => (a.winRate > b.winRate ? a : b));
    if (best.winRate >= 70 && best.matchesTogether >= 3) {
      return (
        <InsightCard icon="bulb-outline">
          Your win rate with <Hl>{best.name}</Hl> is <Hl>{best.winRate}%</Hl> across{' '}
          {best.matchesTogether} matches. That's a partnership worth keeping.
        </InsightCard>
      );
    }
  }
  if (stats.winRate >= 60) {
    return (
      <InsightCard icon="trending-up-outline">
        A <Hl>{stats.winRate}%</Hl> win rate across {stats.matchesPlayed} matches — solid form.
        Keep competing to unlock more insights.
      </InsightCard>
    );
  }
  return null;
}

/** Progress bar used in breakdown cards */
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.bdBarBg}>
      <View style={[styles.bdBarFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

/** Generic breakdown card */
function BreakdownCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: IconName;
  items: FormatBreakdown[];
}) {
  const bdColors = [Colors.opticYellow, Colors.aquaGreen, Colors.violet, Colors.coral, Colors.gold];

  if (items.length === 0) return null;
  return (
    <View style={styles.bdCard}>
      <View style={styles.bdHeader}>
        <Ionicons name={icon} size={14} color={Colors.textDim} style={styles.bdIcon} />
        <Text style={styles.bdTitle}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={item.label} style={i > 0 ? { marginTop: Spacing[1] + 2 } : undefined}>
          <View style={styles.bdRow}>
            <Text style={styles.bdLabel}>{item.label}</Text>
            <Text style={[styles.bdValue, { color: bdColors[i % bdColors.length] }]}>
              {item.winRate}%
            </Text>
          </View>
          <ProgressBar value={item.winRate} color={bdColors[i % bdColors.length]} />
        </View>
      ))}
    </View>
  );
}

/** Partner row */
function PartnerRow({ partner, colorIndex }: { partner: PartnerStat; colorIndex: number }) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();
  const wrColor = partner.winRate >= 70 ? Colors.success : partner.winRate >= 55 ? Colors.warning : Colors.error;
  const avatarColor = PARTNER_COLORS[colorIndex % PARTNER_COLORS.length];

  return (
    <AnimatedPressable
      style={[styles.partnerRow, animatedStyle]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      accessibilityRole="button"
      accessibilityLabel={`${partner.name}, ${partner.matchesTogether} matches together, ${partner.winRate}% win rate`}
    >
      <View style={[styles.partnerAvatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.partnerInitials}>{partner.initials}</Text>
      </View>
      <View style={styles.partnerInfo}>
        <Text style={styles.partnerName}>{partner.name}</Text>
        <Text style={styles.partnerGames}>{partner.matchesTogether} matches together</Text>
      </View>
      <View style={styles.partnerRight}>
        <Text style={[styles.partnerWr, { color: wrColor }]}>{partner.winRate}%</Text>
        <Text style={styles.partnerWrLabel}>Win Rate</Text>
      </View>
    </AnimatedPressable>
  );
}

/** Head-to-head rival card */
function H2HCard({ rival }: { rival: RivalStat }) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();
  const total = rival.wins + rival.draws + rival.losses;
  const wPct = total > 0 ? (rival.wins / total) * 100 : 0;
  const dPct = total > 0 ? (rival.draws / total) * 100 : 0;
  const lPct = total > 0 ? (rival.losses / total) * 100 : 0;
  const recordColor = rival.wins > rival.losses ? Colors.success : rival.wins < rival.losses ? Colors.error : Colors.warning;

  return (
    <AnimatedPressable
      style={[styles.h2hCard, animatedStyle]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      accessibilityRole="button"
      accessibilityLabel={`${rival.name}, record ${rival.wins} wins ${rival.draws} draws ${rival.losses} losses`}
    >
      <View style={styles.h2hTop}>
        <View style={[styles.h2hAvatar, { backgroundColor: Colors.surface }]}>
          <Text style={styles.h2hInitials}>{rival.initials}</Text>
        </View>
        <Text style={styles.h2hName}>{rival.name}</Text>
        <Text style={[styles.h2hRecord, { color: recordColor }]}>
          {rival.wins}W-{rival.draws}D-{rival.losses}L
        </Text>
      </View>
      <View style={styles.h2hBar}>
        {wPct > 0 && <View style={[styles.h2hWins, { width: `${wPct}%` }]} />}
        {dPct > 0 && <View style={[styles.h2hDraws, { width: `${dPct}%` }]} />}
        {lPct > 0 && <View style={[styles.h2hLosses, { width: `${lPct}%` }]} />}
      </View>
    </AnimatedPressable>
  );
}

/** Derived achievements from real stats */
function DerivedAchievements({ stats, totalMatchesPlayed }: { stats: PlayerStats; totalMatchesPlayed: number }) {
  type Achievement = {
    id: string;
    icon: IconName;
    name: string;
    earned: boolean;
  };

  const achievements: Achievement[] = [
    { id: '1', icon: 'trophy-outline', name: 'First Win', earned: stats.matchesWon >= 1 },
    { id: '2', icon: 'flame-outline', name: '5-Win Streak', earned: stats.currentStreak.type === 'W' && stats.currentStreak.count >= 5 },
    { id: '3', icon: 'checkmark-done-outline', name: '10 Matches', earned: totalMatchesPlayed >= 10 },
    { id: '4', icon: 'people-outline', name: '3 Partners', earned: stats.partners.length >= 3 },
    { id: '5', icon: 'podium-outline', name: '5 Tournaments', earned: stats.tournamentCount >= 5 },
    { id: '6', icon: 'star-outline', name: '50 Matches', earned: totalMatchesPlayed >= 50 },
    { id: '7', icon: 'diamond-outline', name: '100 Matches', earned: totalMatchesPlayed >= 100 },
    { id: '8', icon: 'ribbon-outline', name: '10-Win Streak', earned: stats.currentStreak.type === 'W' && stats.currentStreak.count >= 10 },
  ];

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <>
      <View style={[styles.sectionHeader, { marginTop: Spacing[4] }]}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.sectionSubtitle}>{earnedCount} / {achievements.length} earned</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementsRow}
      >
        {achievements.map((ach) => (
          <View
            key={ach.id}
            style={[styles.achBadge, ach.earned ? styles.achEarned : styles.achLocked]}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${ach.name}, ${ach.earned ? 'earned' : 'locked'}`}
          >
            <Ionicons
              name={ach.icon}
              size={22}
              color={ach.earned ? Colors.opticYellow : Colors.textMuted}
              style={styles.achIconWrap}
            />
            <Text style={[styles.achName, ach.earned && styles.achNameGold]}>{ach.name}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

/** Empty state for new users with 0 matches */
function EmptyStats({ name }: { name: string }) {
  const router = useRouter();

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="stats-chart-outline" size={56} color={Colors.surfaceLight} />
      </View>
      <Text style={styles.emptyTitle}>No stats yet</Text>
      <Text style={styles.emptySubtitle}>
        Play your first tournament or import your match history from another padel app.
      </Text>
      <Pressable
        style={styles.emptyCta}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/(app)/import-matches');
        }}
        accessibilityRole="button"
        accessibilityLabel="Import match history"
      >
        <Ionicons name="cloud-upload-outline" size={18} color={Colors.darkBg} />
        <Text style={styles.emptyCtaText}>Import Match History</Text>
      </Pressable>
      <Pressable
        style={styles.emptyCtaSecondary}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(app)/(tabs)/play');
        }}
        accessibilityRole="button"
        accessibilityLabel="Go to Play tab"
      >
        <Ionicons name="tennisball" size={16} color={Colors.opticYellow} />
        <Text style={styles.emptyCtaSecondaryText}>Find a Game</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('All Time');
  const [matchTypeFilter, setMatchTypeFilter] = useState<MatchTypeFilter>('all');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [ratings, setRatings] = useState<RatingPoint[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [statsResult, ratingsResult, historyResult] = await Promise.allSettled([
        fetchPlayerStats(user.id, period, matchTypeFilter),
        fetchPlatformRatings(user.id),
        fetchMatchHistory(user.id, 20, 0, matchTypeFilter),
      ]);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (ratingsResult.status === 'fulfilled') setRatings(ratingsResult.value);
      if (historyResult.status === 'fulfilled') setMatchHistory(historyResult.value);
    } catch {
      // Silently fail — keep showing last known state or empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, period, matchTypeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  const loadMoreHistory = useCallback(async () => {
    if (!user) return;
    try {
      const more = await fetchMatchHistory(user.id, 20, matchHistory.length, matchTypeFilter);
      setMatchHistory((prev) => [...prev, ...more]);
    } catch {
      // Silently fail
    }
  }, [user, matchHistory.length, matchTypeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const displayName = profile?.display_name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Player';
  const level = profile?.smashd_level ?? 0;
  const totalMatchesPlayed = profile?.matches_played ?? 0;
  const playingSince = profile?.created_at ?? new Date().toISOString();
  const hasMatches = stats !== null && stats.matchesPlayed > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stats</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerIconImport}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(app)/import-matches');
            }}
            accessibilityRole="button"
            accessibilityLabel="Import matches"
          >
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.darkBg} />
            <Text style={styles.headerImportText}>Import</Text>
          </Pressable>
          <Pressable
            style={styles.headerIcon}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            accessibilityRole="button"
            accessibilityLabel="Chart view"
          >
            <Ionicons name="bar-chart-outline" size={20} color={Colors.textDim} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.opticYellow}
          />
        }
      >
        {loading ? (
          <ListSkeleton count={6} />
        ) : !hasMatches ? (
          <>
            {/* Period Tabs — show but disabled feel */}
            <PeriodTabs active={period} onChange={setPeriod} />
            <MatchTypeTabs active={matchTypeFilter} onChange={setMatchTypeFilter} />

            {/* Empty hero with real profile data (level 0, 0 matches) */}
            <HeroCard
              name={displayName}
              level={level}
              matchesPlayed={0}
              winRate={0}
              tournamentCount={0}
              streak={{ type: 'W', count: 0 }}
              playingSince={playingSince}
            />

            {/* Empty state CTA */}
            <EmptyStats name={displayName} />
          </>
        ) : (
          <>
            {/* Period Tabs */}
            <PeriodTabs active={period} onChange={setPeriod} />
            <MatchTypeTabs active={matchTypeFilter} onChange={setMatchTypeFilter} />

            {/* Hero Card — real data */}
            <HeroCard
              name={displayName}
              level={level}
              matchesPlayed={stats.matchesPlayed}
              winRate={stats.winRate}
              tournamentCount={stats.tournamentCount}
              streak={stats.currentStreak}
              playingSince={playingSince}
            />

            {/* Recent Form */}
            {stats.recentForm.length > 0 && (
              <FormStrip form={stats.recentForm} />
            )}

            {/* Dynamic insight from real stats */}
            <StatsInsight stats={stats} />

            {/* Rating Progression Chart */}
            <RatingProgressionChart ratings={ratings} />

            {/* Win Rate Trend */}
            <WinRateTrendChart data={stats.winRateTrend} />

            {/* Performance Breakdowns */}
            {(stats.formatBreakdown.length > 0 ||
              stats.conditionsBreakdown.length > 0 ||
              stats.courtSideBreakdown.length > 0 ||
              stats.intensityBreakdown.length > 0) && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Performance Breakdown</Text>
                </View>
                <View style={styles.breakdownGrid}>
                  <BreakdownCard title="BY FORMAT" icon="analytics-outline" items={stats.formatBreakdown} />
                  <BreakdownCard title="CONDITIONS" icon="partly-sunny-outline" items={stats.conditionsBreakdown} />
                  <BreakdownCard title="COURT SIDE" icon="swap-horizontal-outline" items={stats.courtSideBreakdown} />
                  <BreakdownCard title="INTENSITY" icon="flame-outline" items={stats.intensityBreakdown} />
                  <BreakdownCard title="GAME TYPE" icon="trophy-outline" items={stats.matchTypeBreakdown} />
                </View>
              </>
            )}

            {/* Best Partners */}
            {stats.partners.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Best Partners</Text>
                </View>
                {stats.partners.map((p, i) => (
                  <PartnerRow key={p.id} partner={p} colorIndex={i} />
                ))}
              </>
            )}

            {/* Head-to-Head Rivals */}
            {stats.rivals.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: Spacing[4] }]}>
                  <Text style={styles.sectionTitle}>Head-to-Head Rivals</Text>
                </View>
                {stats.rivals.map((r) => (
                  <H2HCard key={r.id} rival={r} />
                ))}
              </>
            )}

            {/* Achievements — derived from real stats */}
            <DerivedAchievements stats={stats} totalMatchesPlayed={totalMatchesPlayed} />

            {/* Match History */}
            <MatchHistoryFeed
              matches={matchHistory}
              onLoadMore={loadMoreHistory}
              onUpdateMatch={async (matchId, updates) => {
                try {
                  await updateMatchDetails(matchId, updates as Parameters<typeof updateMatchDetails>[1]);
                  // Optimistically update local state
                  setMatchHistory((prev) =>
                    prev.map((m) => {
                      if (m.id !== matchId) return m;
                      return {
                        ...m,
                        intensity: 'intensity' in updates ? (updates.intensity ?? null) : m.intensity,
                        conditions: 'conditions' in updates ? (updates.conditions ?? null) : m.conditions,
                        courtSide: 'court_side' in updates ? (updates.court_side ?? null) : m.courtSide,
                      };
                    }),
                  );
                } catch {
                  // Silently fail — user can retry
                }
              }}
            />

            {/* Bottom spacing */}
            <View style={{ height: Spacing[10] }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
  },
  headerTitle: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: Colors.opticYellow,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[10],
  },

  // Period Tabs
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing[4],
  },
  periodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: Colors.opticYellow,
    ...Shadows.glowYellow,
  },
  periodTabText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  periodTabTextActive: {
    color: Colors.darkBg,
  },

  // Hero Card (gradient)
  heroCardOuter: {
    borderRadius: Radius.lg,
    marginBottom: Spacing[4],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    ...Shadows.md,
  },
  heroCard: {
    padding: Spacing[5],
    borderRadius: Radius.lg,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(204,255,0,0.1)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    marginBottom: Spacing[4],
  },
  // Level ring (SVG)
  levelRingContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRingSvg: {
    position: 'absolute',
  },
  levelInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelValue: {
    fontFamily: Fonts.mono,
    fontSize: 22,
    color: Colors.opticYellow,
    lineHeight: 26,
  },
  levelLabel: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  heroSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[2] + 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
  },
  heroStatVal: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    lineHeight: 22,
  },
  heroStatLbl: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroStatLblRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2] + 2,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Form strip
  formStrip: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: Spacing[4],
  },
  formDot: {
    flex: 1,
    height: 32,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formDotText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
  },

  // Insight card
  insightCard: {
    flexDirection: 'row',
    gap: Spacing[2] + 2,
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: 'rgba(123,47,190,0.15)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.violet,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: Spacing[4],
  },
  insightIconWrap: {
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  insightHighlight: {
    fontFamily: Fonts.bodyBold,
    color: Colors.opticYellow,
  },

  // Breakdown grid
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2] + 2,
    marginBottom: Spacing[4],
  },
  bdCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 14,
  },
  bdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1] + 2,
    marginBottom: Spacing[2] + 2,
  },
  bdIcon: {
    marginRight: 2,
  },
  bdTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  bdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  bdLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
  },
  bdValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
  },
  bdBarBg: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  bdBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Partner row
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2] + 2,
    paddingVertical: Spacing[2] + 2,
    paddingHorizontal: Spacing[3],
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing[2],
  },
  partnerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInitials: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  partnerGames: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  partnerRight: {
    alignItems: 'flex-end',
  },
  partnerWr: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
  },
  partnerWrLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textMuted,
  },

  // H2H Card
  h2hCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: Spacing[2],
  },
  h2hTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2] + 2,
    marginBottom: Spacing[2],
  },
  h2hAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  h2hInitials: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.textDim,
  },
  h2hName: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  h2hRecord: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
  },
  h2hBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    gap: 2,
  },
  h2hWins: {
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  h2hDraws: {
    backgroundColor: Colors.warning,
    borderRadius: 3,
  },
  h2hLosses: {
    backgroundColor: Colors.error,
    borderRadius: 3,
  },

  // Achievements
  achievementsRow: {
    gap: Spacing[2] + 2,
    paddingBottom: Spacing[1],
  },
  achBadge: {
    width: 90,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  achEarned: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderColor: Colors.gold,
  },
  achLocked: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    opacity: 0.4,
  },
  achIconWrap: {
    marginBottom: 4,
  },
  achName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 12,
  },
  achNameGold: {
    color: Colors.gold,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing[8],
    paddingHorizontal: Spacing[6],
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  emptyTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: Spacing[2],
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing[6],
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.opticYellow,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
  },
  emptyCtaText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.darkBg,
  },
  emptyCtaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.opticYellow,
    marginTop: Spacing[3],
  },
  emptyCtaSecondaryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },

  // Match type filter tabs
  matchTypeTabs: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  matchTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  matchTypeTabActive: {
    backgroundColor: Colors.opticYellow,
    borderColor: Colors.opticYellow,
  },
  matchTypeTabText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.textMuted,
  },
  matchTypeTabTextActive: {
    color: Colors.darkBg,
  },

  // Header import button
  headerIconImport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.opticYellow,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
  },
  headerImportText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.darkBg,
  },
});
