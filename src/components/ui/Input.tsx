import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, Fonts, Radius, Duration } from '../../lib/constants';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  const focusGlowStyle = useAnimatedStyle(() => ({
    shadowColor: Colors.opticYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: focusProgress.value * 0.1,
    shadowRadius: focusProgress.value * 12,
    elevation: focusProgress.value * 4,
  }));

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <AnimatedView style={[focusGlowStyle]}>
        <TextInput
          style={[
            styles.input,
            focused && styles.inputFocused,
            error && styles.inputError,
            style,
          ]}
          accessibilityLabel={label}
          accessibilityState={error ? { disabled: false } : undefined}
          accessibilityHint={error ? `Error: ${error}` : undefined}
          placeholderTextColor={Colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            focusProgress.value = withTiming(1, { duration: Duration.fast });
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focusProgress.value = withTiming(0, { duration: Duration.fast });
            props.onBlur?.(e);
          }}
          {...props}
        />
      </AnimatedView>
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.text,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: Colors.opticYellow,
  },
  inputError: {
    borderColor: Colors.error,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.error,
  },
});
