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
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/providers/AuthProvider';
import { Alpha, Colors, Fonts, Spacing, Radius, Shadows } from '../../../src/lib/constants';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { AnimatedPressable, useSpringPress } from '../../../src/hooks/useSpringPress';
import {
  fetchPlayerStats,
  fetchMatchHistory,
  type PlayerStats,
  type Period,
  type PartnerStat,
  type FormResult,
  type MatchHistoryItem,
} from '../../../src/services/stats-service';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';

// New curated components
import { StatsHeader } from '../../../src/components/stats/StatsHeader';
import { PadelDNACard } from '../../../src/components/stats/PadelDNACard';
import { HighlightGrid } from '../../../src/components/stats/HighlightGrid';
import { RecentMatches } from '../../../src/components/stats/RecentMatches';
import { PerformanceSection } from '../../../src/components/stats/PerformanceSection';

// ─── Types ───────────────────────────────────────────────────────────────────
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const PARTNER_COLORS = [Colors.aquaGreen, Colors.violet, Colors.coral, Colors.opticYellow, Colors.gold];

// ─── Period Tabs ─────────────────────────────────────────────────────────────
const PERIOD_TEST_IDS: Record<string, string> = {
  Week: 'tab-stats-week',
  Month: 'tab-stats-month',
  Season: 'tab-stats-season',
  'All Time': 'tab-stats-all',
};

function PeriodTabs({ active, onChange }: { active: Period; onChange: (p: Period) => void }) {
  const periods: Period[] = ['Week', 'Month', 'Season', 'All Time'];
  return (
    <View style={styles.periodTabs}>
      {periods.map((p) => (
        <Pressable
          key={p}
          testID={PERIOD_TEST_IDS[p]}
          style={[styles.periodTab, active === p && styles.periodTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(p);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: active === p }}
        >
          <Text style={[styles.periodTabText, active === p && styles.periodTabTextActive]}>
            {p}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Form Strip ──────────────────────────────────────────────────────────────
function FormStrip({ form }: { form: FormResult[] }) {
  const colors: Record<FormResult, { bg: string; text: string; border: string }> = {
    W: { bg: 'rgba(34,197,94,0.12)', text: Colors.success, border: 'rgba(34,197,94,0.25)' },
    L: { bg: 'rgba(239,68,68,0.12)', text: Colors.error, border: 'rgba(239,68,68,0.25)' },
    D: { bg: 'rgba(251,146,60,0.12)', text: Colors.warning, border: 'rgba(251,146,60,0.25)' },
  };
  return (
    <View style={styles.formStripContainer}>
      <Text style={styles.miniLabel}>Recent Form</Text>
      <View style={styles.formStrip}>
        {form.map((r, i) => (
          <View
            key={i}
            style={[
              styles.formDot,
              { backgroundColor: colors[r].bg, borderColor: colors[r].border },
            ]}
          >
            <Text style={[styles.formDotText, { color: colors[r].text }]}>{r}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Insight Card ────────────────────────────────────────────────────────────
function Hl({ children }: { children: React.ReactNode }) {
  return <Text style={styles.insightHighlight}>{children}</Text>;
}

function StatsInsight({ stats }: { stats: PlayerStats }) {
  if (stats.currentStreak.count >= 3 && stats.currentStreak.type === 'W') {
    return (
      <View style={styles.insightCard}>
        <Ionicons name="flash-outline" size={18} color={Colors.opticYellow} />
        <Text style={styles.insightText}>
          You've won <Hl>{stats.currentStreak.count} in a row</Hl> — your best form yet. Keep it up!
        </Text>
      </View>
    );
  }
  if (stats.partners.length > 0) {
    const best = stats.partners.reduce((a, b) => (a.winRate > b.winRate ? a : b));
    if (best.winRate >= 70 && best.matchesTogether >= 3) {
      return (
        <View style={styles.insightCard}>
          <Ionicons name="bulb-outline" size={18} color={Colors.opticYellow} />
          <Text style={styles.insightText}>
            Your win rate with <Hl>{best.name}</Hl> is <Hl>{best.winRate}%</Hl> across {best.matchesTogether} matches.
          </Text>
        </View>
      );
    }
  }
  if (stats.winRate >= 60) {
    return (
      <View style={styles.insightCard}>
        <Ionicons name="trending-up-outline" size={18} color={Colors.opticYellow} />
        <Text style={styles.insightText}>
          A <Hl>{stats.winRate}%</Hl> win rate across {stats.matchesPlayed} matches — solid form.
        </Text>
      </View>
    );
  }
  return null;
}

// ─── Partner Row ─────────────────────────────────────────────────────────────
function PartnerRow({ partner, colorIndex }: { partner: PartnerStat; colorIndex: number }) {
  const wrColor = partner.winRate >= 70 ? Colors.success : partner.winRate >= 55 ? Colors.warning : Colors.error;
  const avatarColor = PARTNER_COLORS[colorIndex % PARTNER_COLORS.length];

  return (
    <View
      style={styles.partnerRow}
      accessibilityLabel={`${partner.name}, ${partner.matchesTogether} matches, ${partner.winRate}% win rate`}
    >
      <View style={[styles.partnerAvatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.partnerInitials}>{partner.initials}</Text>
      </View>
      <View style={styles.partnerInfo}>
        <Text style={styles.partnerName}>{partner.name}</Text>
        <Text style={styles.partnerGames}>{partner.matchesTogether} matches</Text>
      </View>
      <Text style={[styles.partnerWr, { color: wrColor }]}>{partner.winRate}%</Text>
    </View>
  );
}

// ─── Achievements ────────────────────────────────────────────────────────────
function Achievements({ stats, totalMatches }: { stats: PlayerStats; totalMatches: number }) {
  type Achievement = { id: string; icon: IconName; name: string; earned: boolean };

  const achievements: Achievement[] = [
    { id: '1', icon: 'trophy-outline', name: 'First Win', earned: stats.matchesWon >= 1 },
    { id: '2', icon: 'flame-outline', name: '5-Win Streak', earned: stats.currentStreak.type === 'W' && stats.currentStreak.count >= 5 },
    { id: '3', icon: 'checkmark-done-outline', name: '10 Matches', earned: totalMatches >= 10 },
    { id: '4', icon: 'people-outline', name: '3 Partners', earned: stats.partners.length >= 3 },
    { id: '5', icon: 'podium-outline', name: '5 Tournaments', earned: stats.tournamentCount >= 5 },
    { id: '6', icon: 'star-outline', name: '50 Matches', earned: totalMatches >= 50 },
    { id: '7', icon: 'diamond-outline', name: '100 Matches', earned: totalMatches >= 100 },
    { id: '8', icon: 'ribbon-outline', name: '10-Win Streak', earned: stats.currentStreak.type === 'W' && stats.currentStreak.count >= 10 },
  ];

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <View>
      <View style={styles.achHeader}>
        <Text style={styles.miniLabel}>Achievements</Text>
        <Text style={styles.achCount}>{earnedCount}/{achievements.length}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achScroll}
      >
        {achievements.map((ach) => (
          <View
            key={ach.id}
            style={[styles.achBadge, ach.earned ? styles.achEarned : styles.achLocked]}
          >
            <Ionicons
              name={ach.icon}
              size={20}
              color={ach.earned ? Colors.opticYellow : Colors.textMuted}
            />
            <Text style={[styles.achName, ach.earned && styles.achNameGold]}>{ach.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('All Time');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const profileId = profile?.id;
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Player';
  const totalMatches = profile?.matches_played ?? 0;

  const fetchData = useCallback(async () => {
    if (!user || !profileId) { setLoading(false); return; }
    try {
      const [statsResult, historyResult] = await Promise.allSettled([
        fetchPlayerStats(user.id, period),
        fetchMatchHistory(user.id, 5),
      ]);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (historyResult.status === 'fulfilled') setMatchHistory(historyResult.value);
    } catch {
      // Silently fail — user can pull to refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profileId, period]);

  // PLA-471: Wait for AuthProvider to settle before firing any fetches.
  useEffect(() => {
    if (authLoading) return;
    if (!profileId) return;
    setLoading(true);
    fetchData();
  }, [authLoading, fetchData, profileId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const hasMatches = stats !== null && stats.matchesPlayed > 0;

  return (
    <ErrorBoundary fallbackMessage="Stats couldn't load. Pull down to retry.">
      <SafeAreaView testID="screen-stats" style={styles.safe} edges={['top']}>
        {/* Header with avatar, name, settings, share */}
        <StatsHeader profile={profile} displayName={displayName} />

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
            <View style={styles.skeletonWrap}>
              <Skeleton width="100%" height={80} borderRadius={Radius.lg} />
              <Skeleton width="100%" height={40} borderRadius={Radius.md} />
              <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
                <Skeleton width="48%" height={80} borderRadius={Radius.md} />
                <Skeleton width="48%" height={80} borderRadius={Radius.md} />
              </View>
              <Skeleton width="100%" height={64} borderRadius={Radius.md} />
              <Skeleton width="100%" height={64} borderRadius={Radius.md} />
            </View>
          ) : !hasMatches ? (
            <View style={styles.content}>
              <PadelDNACard />
              <EmptyState
                icon="stats-chart-outline"
                title="No stats yet"
                subtitle="Play your first tournament or log a match to see your stats here."
                actions={[
                  {
                    label: 'Import Matches',
                    onPress: () => router.push('/(app)/import-matches'),
                    testID: 'btn-import-matches',
                  },
                ]}
              />
            </View>
          ) : (
            <View style={styles.content}>
              {/* Padel DNA placeholder */}
              <PadelDNACard />

              {/* Period filter */}
              <PeriodTabs active={period} onChange={setPeriod} />

              {/* Key metrics */}
              <HighlightGrid stats={stats} />

              {/* Recent form */}
              {stats.recentForm.length > 0 && (
                <FormStrip form={stats.recentForm} />
              )}

              {/* AI insight */}
              <StatsInsight stats={stats} />

              {/* Recent matches */}
              <RecentMatches matches={matchHistory} />

              {/* Collapsible performance breakdown */}
              <PerformanceSection stats={stats} />

              {/* Partners (top 3) */}
              {stats.partners.length > 0 && (
                <View>
                  <Text style={styles.miniLabel}>Partners</Text>
                  {stats.partners.slice(0, 3).map((p, i) => (
                    <PartnerRow key={p.id} partner={p} colorIndex={i} />
                  ))}
                </View>
              )}

              {/* Achievements */}
              <Achievements stats={stats} totalMatches={totalMatches} />

              <View style={{ height: Spacing[10] }} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  scrollContent: {
    paddingBottom: Spacing[10],
  },
  skeletonWrap: {
    padding: Spacing[5],
    gap: Spacing[3],
  },
  content: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[4],
  },

  // Period Tabs
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 3,
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

  // Form Strip
  formStripContainer: {
    gap: Spacing[2],
  },
  formStrip: {
    flexDirection: 'row',
    gap: 6,
  },
  formDot: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formDotText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
  },

  // Insight
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
  },
  insightText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  insightHighlight: {
    fontFamily: Fonts.bodyBold,
    color: Colors.opticYellow,
  },

  // Partners
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[3],
    marginBottom: Spacing[1],
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
    color: Colors.darkBg,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  partnerGames: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  partnerWr: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },

  // Achievements
  achHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  achCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  achScroll: {
    gap: Spacing[2],
    paddingRight: Spacing[4],
  },
  achBadge: {
    alignItems: 'center',
    gap: 4,
    width: 72,
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
  },
  achEarned: {
    backgroundColor: Alpha.yellow08,
    borderWidth: 1,
    borderColor: Alpha.yellow15,
  },
  achLocked: {
    backgroundColor: Colors.card,
    opacity: 0.5,
  },
  achName: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  achNameGold: {
    color: Colors.opticYellow,
  },

  // Labels
  miniLabel: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.textPrimary,
  },
});
