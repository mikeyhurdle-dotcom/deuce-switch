import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import type { TrackingTool } from '../../lib/types';

type ToolDef = {
  key: TrackingTool;
  name: string;
  logo: string;
  color: string;
  badges: string[];
};

export const TRACKING_TOOLS: ToolDef[] = [
  { key: 'padelio', name: 'Padelio', logo: 'PA', color: '#4CAF50', badges: ['Shots', 'Fitness'] },
  { key: 'padelplay', name: 'PadelPlay', logo: 'PP', color: '#2196F3', badges: ['Shots'] },
  { key: 'padel_point', name: 'Padel Point', logo: 'PT', color: '#FF5722', badges: ['Score', 'Fitness'] },
  { key: 'padel_pointer', name: 'Padel Pointer', logo: 'PR', color: '#9C27B0', badges: ['Score', 'Service'] },
  { key: 'padeltick', name: 'PadelTick', logo: 'TK', color: '#FF9800', badges: ['Score'] },
  { key: 'apple_health', name: 'Apple Health', logo: 'AH', color: '#FF2D55', badges: ['Fitness'] },
  { key: 'strava', name: 'Strava', logo: 'ST', color: '#FC4C02', badges: ['Fitness'] },
  { key: 'manual', name: 'Manual', logo: 'M', color: Colors.textDim, badges: ['Score'] },
];

type Props = {
  selected: TrackingTool[];
  onToggle: (tool: TrackingTool) => void;
};

export function ToolSelectionGrid({ selected, onToggle }: Props) {
  return (
    <View style={styles.grid}>
      {TRACKING_TOOLS.map((tool) => {
        const active = selected.includes(tool.key);
        return (
          <Pressable
            key={tool.key}
            testID={`btn-tool-${tool.key}`}
            style={[styles.card, active && styles.cardActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle(tool.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${tool.name}, ${active ? 'selected' : 'not selected'}`}
          >
            <View style={[styles.logo, { backgroundColor: tool.color }]}>
              <Text style={styles.logoText}>{tool.logo}</Text>
            </View>
            <Text style={[styles.name, active && styles.nameActive]}>{tool.name}</Text>
            <View style={styles.badges}>
              {tool.badges.map((b) => (
                <Text key={b} style={styles.badge}>{b}</Text>
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  card: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[1],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardActive: {
    backgroundColor: Alpha.yellow08,
    borderColor: Alpha.yellow20,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  nameActive: {
    color: Colors.opticYellow,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
    backgroundColor: Colors.card,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
