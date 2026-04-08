import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';

type Props = {
  shotType: string | null;
  skillLevel: string | null;
  onShotTypeChange: (v: string | null) => void;
  onSkillLevelChange: (v: string | null) => void;
};

const SHOT_TYPES = ['Bandeja', 'Vibora', 'Chiquita', 'Serve', 'Strategy'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function FilterChips({ shotType, skillLevel, onShotTypeChange, onSkillLevelChange }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip
          label="All"
          active={!shotType}
          onPress={() => onShotTypeChange(null)}
        />
        {SHOT_TYPES.map((st) => (
          <Chip
            key={st}
            label={st}
            active={shotType === st.toLowerCase()}
            onPress={() => onShotTypeChange(shotType === st.toLowerCase() ? null : st.toLowerCase())}
          />
        ))}
        <View style={styles.divider} />
        {SKILL_LEVELS.map((sl) => (
          <Chip
            key={sl}
            label={sl}
            active={skillLevel === sl.toLowerCase()}
            onPress={() => onSkillLevelChange(skillLevel === sl.toLowerCase() ? null : sl.toLowerCase())}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[2],
  },
  row: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Alpha.yellow08,
    borderColor: Alpha.yellow20,
  },
  chipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: Colors.opticYellow,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
});
