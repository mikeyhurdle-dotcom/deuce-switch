import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors, Radius, Shadows } from '../../lib/constants';

type CardVariant = 'default' | 'highlighted' | 'surface' | 'elevated' | 'glow';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: CardVariant;
};

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View style={[styles.card, variantStyles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

const variantStyles = StyleSheet.create({
  default: {},
  highlighted: {
    borderColor: Colors.opticYellow,
  },
  surface: {
    backgroundColor: Colors.surface,
    borderColor: 'transparent',
  },
  elevated: {
    backgroundColor: Colors.card,
    ...Shadows.md,
  },
  glow: {
    borderColor: Colors.opticYellow,
    ...Shadows.glowYellow,
  },
});
