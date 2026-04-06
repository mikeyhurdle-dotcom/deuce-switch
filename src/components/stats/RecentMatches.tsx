import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import type { MatchHistoryItem } from '../../services/stats-service';

type Props = {
  matches: MatchHistoryItem[];
};

export function RecentMatches({ matches }: Props) {
  const router = useRouter();
  if (matches.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Matches</Text>
      {matches.slice(0, 5).map((m) => {
        const won = m.won;
        const draw = m.teamScore === m.opponentScore;
        const resultColor = won ? Colors.success : draw ? Colors.warning : Colors.error;
        const resultLabel = won ? 'W' : draw ? 'D' : 'L';
        const dateStr = new Date(m.date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
        const opponents = [m.opponent1Name, m.opponent2Name].filter(Boolean).join(', ') || 'Unknown';

        return (
          <Pressable
            key={m.id}
            style={styles.row}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/(app)/match/${m.id}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Match on ${dateStr}, ${resultLabel}, ${m.teamScore}-${m.opponentScore}`}
          >
            <View style={[styles.resultBadge, { backgroundColor: resultColor + '18' }]}>
              <Text style={[styles.resultText, { color: resultColor }]}>{resultLabel}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.score} numberOfLines={1}>
                {m.teamScore} - {m.opponentScore}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {opponents} · {dateStr}
              </Text>
            </View>
            {m.source && (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceText}>{m.source}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing[1],
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[3],
  },
  resultBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  score: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  sourceBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textDim,
    textTransform: 'capitalize',
  },
});
