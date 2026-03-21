import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../lib/constants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WizardNavBarProps {
  currentStep: 1 | 2 | 3;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
  nextDisabled?: boolean;
  createLoading?: boolean;
}

export default function WizardNavBar({
  currentStep,
  onBack,
  onNext,
  onCreate,
  nextDisabled = false,
  createLoading = false,
}: WizardNavBarProps) {
  return (
    <View style={styles.container}>
      {/* Back button — hidden on step 1 */}
      {currentStep > 1 ? (
        <SpringButton
          label="Back"
          onPress={onBack}
          variant="secondary"
        />
      ) : (
        <View style={styles.spacer} />
      )}

      {/* Next / Create button */}
      {currentStep < 3 ? (
        <SpringButton
          label="Next"
          onPress={onNext}
          variant="primary"
          disabled={nextDisabled}
        />
      ) : (
        <SpringButton
          label={createLoading ? 'Creating...' : 'Create Tournament'}
          onPress={onCreate}
          variant="cta"
          disabled={createLoading}
        />
      )}
    </View>
  );
}

/* ── Spring-Animated Button ─────────────────────────────────────── */

function SpringButton({
  label,
  onPress,
  variant,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary' | 'cta';
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 400,
      mass: 0.3,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
      mass: 0.3,
    });
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const buttonStyle = [
    styles.button,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'cta' && styles.buttonCta,
    disabled && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.buttonText,
    variant === 'secondary' && styles.buttonTextSecondary,
    variant === 'cta' && styles.buttonTextCta,
    disabled && styles.buttonTextDisabled,
  ];

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[buttonStyle, animatedStyle]}
      disabled={disabled}
    >
      <Text style={textStyle}>{label}</Text>
    </AnimatedPressable>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    paddingBottom: Spacing[8],
    backgroundColor: Colors.darkBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  spacer: {
    width: 100,
  },
  button: {
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  buttonSecondary: {
    backgroundColor: Colors.surface,
  },
  buttonPrimary: {
    backgroundColor: Colors.opticYellow,
  },
  buttonCta: {
    backgroundColor: Colors.opticYellow,
    paddingHorizontal: Spacing[8],
    ...Shadows.glowYellow,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.darkBg,
  },
  buttonTextSecondary: {
    color: Colors.textSecondary,
  },
  buttonTextCta: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    color: Colors.darkBg,
  },
  buttonTextDisabled: {
    opacity: 0.6,
  },
});
