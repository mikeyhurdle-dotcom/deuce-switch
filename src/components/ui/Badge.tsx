import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Colors, Fonts, Radius } from '../../lib/constants';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export type BadgeProps = {
  label?: string;
  text?: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
};

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.surface, text: Colors.textDim },
  success: { bg: 'rgba(34, 197, 94, 0.12)', text: Colors.success },
  warning: { bg: 'rgba(251, 146, 60, 0.12)', text: Colors.warning },
  error: { bg: 'rgba(239, 68, 68, 0.12)', text: Colors.error },
  info: { bg: 'rgba(0, 207, 193, 0.12)', text: Colors.aquaGreen },
};

export function Badge({ label, text, variant = 'default', style }: BadgeProps) {
  const content = label ?? text ?? '';
  const colors = variantColors[variant];
  return (
    <View
      style={[styles.badge, { backgroundColor: colors.bg }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={content}
    >
      <Text style={[styles.text, { color: colors.text }]}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
