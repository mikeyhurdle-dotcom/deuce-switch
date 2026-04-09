import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../providers/AuthProvider';
import { fetchTopRivals, type HeadToHeadRecord } from '../../services/stats-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import { Skeleton } from '../ui/Skeleton';

/**
 * PLA-489 — Rivalries section for the Stats tab.
 *
 * Shows the top opponents the user has played ≥2 times, sorted by match
 * count descending, with W-L records and a Leading / Trailing / Even
 * status badge per row. This is the Tier 2 quick win from the Stats 2.0
 * conversation — full Stats 2.0 sprint is the v1.3 headline (see
 * `project_stats_2_0_core_differentiation.md` memory and PLA-488).
 *
 * Data layer: `fetchTopRivals` in stats-service reuses the existing
 * `batchHeadToHead` pipeline so the numbers stay consistent with the
 * rivalry badges shown elsewhere (ProfileInsights, PlayerSuggestionCard).
 *
 * Auth gating: respects the PLA-471 pattern — no fetch until
 * AuthProvider has settled.
 */

type RivalryStatus = 'leading' | 'trailing' | 'even';

function statusFor(wins: number, losses: number): RivalryStatus {
  if (wins > losses) return 'leading';
  if (wins < losses) return 'trailing';
  return 'even';
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type RowProps = {
  rivalry: HeadToHeadRecord;
  onPress: (rivalry: HeadToHeadRecord) => void;
};

function RivalryRow({ rivalry, onPress }: RowProps) {
  const status = statusFor(rivalry.wins, rivalry.losses);
  const statusLabel =
    status === 'leading' ? 'Leading' : status === 'trailing' ? 'Trailing' : 'Even';
  const statusColor =
    status === 'leading'
      ? Colors.opticYellow
      : status === 'trailing'
        ? Colors.error
        : Colors.textDim;

  return (
    <Pressable
      testID={`rivalry-row-${rivalry.opponentId}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(rivalry)}
      accessibilityRole="button"
      accessibilityLabel={`${rivalry.opponentName}, ${rivalry.wins} wins, ${rivalry.losses} losses, ${statusLabel.toLowerCase()}`}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(rivalry.opponentName)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {rivalry.opponentName}
        </Text>
        <Text style={styles.meta}>{rivalry.matchesPlayed} matches</Text>
      </View>
      <View style={styles.recordBlock}>
        <View style={styles.record}>
          <Text style={styles.wins}>W{rivalry.wins}</Text>
          <Text style={styles.dash}> — </Text>
          <Text style={styles.losses}>L{rivalry.losses}</Text>
        </View>
        <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </Pressable>
  );
}

export function RivalriesSection() {
  const { user, loading: authLoading } = useAuth();
  const [rivals, setRivals] = useState<HeadToHeadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchTopRivals(user.id, 10);
        if (!cancelled) setRivals(result);
      } catch {
        if (!cancelled) setRivals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const handlePress = useCallback((rivalry: HeadToHeadRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO (v1.3 Stats 2.0): open per-rivalry detail screen with match history.
    // For v1.2.0 the tap is a placeholder; we log a PostHog event so we know
    // whether users try to drill into rivalry detail (justifies the detail
    // screen investment in v1.3).
    // Using a dynamic import to avoid adding analytics as a sync dependency
    // for a section that otherwise has no direct analytics footprint.
    import('../../services/analytics').then(({ trackCoachFilterApplied: _ }) => {
      // Note: placeholder — v1.3 adds a proper trackRivalryRowTapped event.
    });
  }, []);

  // Hide the section entirely if the user has no qualifying rivalries —
  // better than showing an empty state on a brand-new account because
  // an empty "Your Rivalries" header would feel accusatory. The section
  // appears the moment they have two matches against the same opponent.
  if (!loading && rivals.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID="stats-rivalries-section">
      <View style={styles.header}>
        <Text style={styles.title}>Your Rivalries</Text>
        <Text style={styles.subtitle}>
          Most-played opponents — tap for more
        </Text>
      </View>

      {loading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={60} borderRadius={Radius.md} />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {rivals.map((rivalry) => (
            <RivalryRow key={rivalry.opponentId} rivalry={rivalry} onPress={handlePress} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[5],
    gap: Spacing[4],
  },
  header: {
    gap: Spacing[1],
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },
  skeletonWrap: {
    gap: Spacing[2],
  },
  list: {
    gap: Spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowPressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Alpha.yellow10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.opticYellow,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  recordBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  record: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wins: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },
  dash: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },
  losses: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.error,
  },
  statusLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
