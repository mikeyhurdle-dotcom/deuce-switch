import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

// ── Props ────────────────────────────────────────────────────────────────────

type ProfileFeedProps = {
  tournaments: RecentTournament[];
};

export function ProfileFeed({ tournaments }: ProfileFeedProps) {
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

  // ── Feed ──
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
    fontSize: 12,
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
    fontSize: 12,
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
    backgroundColor: Alpha.yellow08,
    borderColor: Alpha.yellow20,
  },
  resultChipAqua: {
    backgroundColor: Alpha.aqua08,
    borderColor: Alpha.aqua20,
  },
  resultChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
  },
});
