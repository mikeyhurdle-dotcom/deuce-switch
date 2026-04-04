import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Alpha } from '../../lib/constants';
import { Badge } from '../ui/Badge';
import { PlayerSuggestionCard } from '../PlayerSuggestionCard';
import type { Profile as ProfileType, TournamentFormat, PlayerSuggestion } from '../../lib/types';
import type { HeadToHeadRecord } from '../../services/stats-service';
import type { Insight, RecentTournament } from './types';

// ── Helpers ─────────────────────────────────────────────────────────────────

export function buildInsights(profile: { preferred_position?: string | null; matches_played?: number; matches_won?: number } | null): Insight[] {
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

// ── Sub-components ──────────────────────────────────────────────────────────

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

// ── Props ────────────────────────────────────────────────────────────────────

type ProfileInsightsProps = {
  profile: ProfileType | null;
  suggestions: PlayerSuggestion[];
  h2hMap: Map<string, HeadToHeadRecord>;
  recentTournaments: RecentTournament[];
  onSuggestionConnected: (userId: string) => void;
  onInvite: (opponentId: string, opponentName: string) => void;
  onGenericInvite: () => void;
  onTournamentPress: (t: RecentTournament) => void;
};

export function ProfileInsights({
  profile,
  suggestions,
  h2hMap,
  recentTournaments,
  onSuggestionConnected,
  onInvite,
  onGenericInvite,
  onTournamentPress,
}: ProfileInsightsProps) {
  const insights = buildInsights(profile);

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

  return (
    <>
      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitlePadded}>INSIGHTS</Text>
          <FlatList
            data={insights}
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
      {(profile?.racket_brand || profile?.shoe_brand) && (
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
            renderItem={({ item }) => {
              const record = h2hMap.get(item.user_id);
              return (
                <PlayerSuggestionCard
                  suggestion={item}
                  onConnected={onSuggestionConnected}
                  h2h={record ? { wins: record.wins, losses: record.losses } : null}
                  onInvite={onInvite}
                />
              );
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
            ItemSeparatorComponent={() => (
              <View style={{ width: 10 }} />
            )}
          />
        </View>
      )}

      {/* Invite Friends CTA */}
      <Pressable
        testID="btn-invite-friends"
        style={styles.inviteCta}
        onPress={onGenericInvite}
      >
        <View style={styles.inviteCtaIconWrap}>
          <Ionicons name="paper-plane" size={20} color={Colors.aquaGreen} />
        </View>
        <View style={styles.inviteCtaContent}>
          <Text style={styles.inviteCtaTitle}>Invite Friends</Text>
          <Text style={styles.inviteCtaDesc}>
            Invite your padel partners to Smashd
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
      </Pressable>

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
              onPress={() => onTournamentPress(t)}
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
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    borderLeftWidth: 2,
    borderLeftColor: Alpha.violet20,
    padding: Spacing[3],
    gap: 4,
  },
  insightValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
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
    fontSize: 12,
    color: Colors.textDim,
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
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Invite CTA ──
  inviteCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[2],
    borderWidth: 1,
    borderColor: Alpha.aqua20,
  },
  inviteCtaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Alpha.aqua08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCtaContent: {
    flex: 1,
    gap: 2,
  },
  inviteCtaTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inviteCtaDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 16,
  },
});
