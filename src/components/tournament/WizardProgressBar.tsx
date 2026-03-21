import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors, Fonts, Spacing, Radius } from '../../lib/constants';

interface WizardProgressBarProps {
  currentStep: 1 | 2 | 3;
  labels?: string[];
}

const DEFAULT_LABELS = ['Basics', 'Settings', 'Preview'];

export default function WizardProgressBar({
  currentStep,
  labels = DEFAULT_LABELS,
}: WizardProgressBarProps) {
  return (
    <View style={styles.container}>
      {labels.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        const isFuture = stepNumber > currentStep;

        return (
          <React.Fragment key={label}>
            {/* Connecting line before step (not for first) */}
            {index > 0 && (
              <StepConnector completed={stepNumber <= currentStep} />
            )}

            {/* Step dot + label */}
            <View style={styles.stepWrapper}>
              <StepDot
                active={isActive}
                completed={isCompleted}
                future={isFuture}
                stepNumber={stepNumber}
              />
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isCompleted && styles.labelCompleted,
                  isFuture && styles.labelFuture,
                ]}
              >
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

/* ── Step Dot ──────────────────────────────────────────────────── */

function StepDot({
  active,
  completed,
  future,
  stepNumber,
}: {
  active: boolean;
  completed: boolean;
  future: boolean;
  stepNumber: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const bgColor = completed
      ? Colors.opticYellow
      : active
        ? Colors.opticYellow
        : Colors.surface;

    const borderColor = completed || active
      ? Colors.opticYellow
      : Colors.surfaceLight;

    const scale = active ? 1.15 : 1;

    return {
      backgroundColor: withTiming(bgColor, { duration: 300 }),
      borderColor: withTiming(borderColor, { duration: 300 }),
      transform: [{ scale: withTiming(scale, { duration: 300 }) }],
    };
  }, [active, completed]);

  return (
    <Animated.View style={[styles.dot, animatedStyle]}>
      {completed ? (
        <Text style={styles.checkmark}>✓</Text>
      ) : (
        <Text
          style={[
            styles.stepNumberText,
            (active || completed) && styles.stepNumberTextActive,
          ]}
        >
          {stepNumber}
        </Text>
      )}
    </Animated.View>
  );
}

/* ── Connector Line ────────────────────────────────────────────── */

function StepConnector({ completed }: { completed: boolean }) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        completed ? Colors.opticYellow : Colors.surfaceLight,
        { duration: 400 }
      ),
    };
  }, [completed]);

  return (
    <View style={styles.connectorWrapper}>
      <View style={styles.connectorTrack} />
      <Animated.View style={[styles.connectorFill, animatedStyle]} />
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[4],
  },
  stepWrapper: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    color: Colors.darkBg,
  },
  stepNumberText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textDim,
  },
  stepNumberTextActive: {
    color: Colors.darkBg,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textDim,
    marginTop: 2,
  },
  labelActive: {
    color: Colors.opticYellow,
    fontFamily: Fonts.bodySemiBold,
  },
  labelCompleted: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bodyMedium,
  },
  labelFuture: {
    color: Colors.textMuted,
  },
  connectorWrapper: {
    flex: 1,
    height: 2,
    marginHorizontal: Spacing[2],
    marginBottom: Spacing[5], // offset to align with dot center (above label)
    position: 'relative',
  },
  connectorTrack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 1,
  },
  connectorFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 1,
  },
});
