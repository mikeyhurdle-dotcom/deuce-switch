import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';

type IconName = keyof typeof Ionicons.glyphMap;

type Action = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  testID?: string;
};

type EmptyStateProps = {
  /** Primary icon */
  icon: IconName;
  /** Optional accent colour for the icon ring (defaults to opticYellow) */
  iconColor?: string;
  /** Optional secondary icon shown as a small badge */
  badgeIcon?: IconName;
  title: string;
  subtitle?: string;
  actions?: Action[];
  testID?: string;
};

/**
 * Standardised empty state with icon ring, title, subtitle, and optional CTA buttons.
 * Designed to be swapped for custom SVG illustrations later.
 */
export function EmptyState({
  icon,
  iconColor = Colors.opticYellow,
  badgeIcon,
  title,
  subtitle,
  actions,
  testID,
}: EmptyStateProps) {
  const ringBg = iconColor + '12'; // 7% opacity

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.container}
      testID={testID}
    >
      {/* Icon ring */}
      <View style={[styles.iconRing, { backgroundColor: ringBg }]}>
        <Ionicons name={icon} size={40} color={iconColor} />
        {badgeIcon && (
          <View style={styles.badge}>
            <Ionicons name={badgeIcon} size={14} color={Colors.textPrimary} />
          </View>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {actions && actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((a) => {
            const isPrimary = a.variant !== 'secondary';
            return (
              <Pressable
                key={a.label}
                testID={a.testID}
                style={[styles.btn, isPrimary ? styles.btnPrimary : styles.btnSecondary]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  a.onPress();
                }}
              >
                <Text style={[styles.btnText, isPrimary ? styles.btnTextPrimary : styles.btnTextSecondary]}>
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[12],
    paddingHorizontal: Spacing[8],
    gap: Spacing[3],
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[3],
  },
  btn: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    borderRadius: Radius.full,
  },
  btnPrimary: {
    backgroundColor: Alpha.yellow10,
    borderWidth: 1,
    borderColor: Alpha.yellow20,
  },
  btnSecondary: {
    backgroundColor: Colors.surface,
  },
  btnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },
  btnTextPrimary: {
    color: Colors.opticYellow,
  },
  btnTextSecondary: {
    color: Colors.textDim,
  },
});
