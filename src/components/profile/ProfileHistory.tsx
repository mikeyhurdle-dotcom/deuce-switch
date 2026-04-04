import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Alpha } from '../../lib/constants';
import type { RecentTournament } from './types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EmptyTab({ title }: { title: string }) {
  return (
    <View testID="state-profile-empty" style={styles.emptyTab}>
      <Ionicons name="construct-outline" size={36} color={Colors.textMuted} />
      <Text style={styles.emptyTabTitle}>{title} coming soon</Text>
      <Text style={styles.emptyTabDesc}>We're working on this feature.</Text>
    </View>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

type HistoryFilter = 'All' | 'Americano' | 'Private' | 'Imported';

// ── Props ────────────────────────────────────────────────────────────────────

type ProfileHistoryProps = {
  tournaments: RecentTournament[];
};

export function ProfileHistory({ tournaments }: ProfileHistoryProps) {
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
            <Pressable
              key={t.tournament_id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/(app)/tournament/${t.tournament_id}/matches`);
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.historyCard}>
                <View style={styles.matchTypeBadge}>
                  <Text style={styles.matchTypeText}>
                    {t.format.toUpperCase().replace('_', ' ')}
                  </Text>
                </View>
                <View style={styles.historyCardInner}>
                  <View style={styles.historyRankBadge}>
                    <Text style={styles.historyRankText}>#{t.rank ?? '\u2014'}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName} numberOfLines={1}>{t.name}</Text>
                    <Text style={styles.historyMeta}>
                      {t.totalPoints ?? 0} pts · {t.playerCount} players · {fmtDate(t.date)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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

  // ── Filter Chips ──
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
    backgroundColor: Alpha.yellow08,
  },
  filterChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.opticYellow,
  },

  // ── History List ──
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
    fontSize: 12,
    color: Colors.textMuted,
  },
});
