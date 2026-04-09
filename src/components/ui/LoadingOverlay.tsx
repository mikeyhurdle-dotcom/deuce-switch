import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Fonts, Shadows } from '../../lib/constants';

type LoadingOverlayProps = {
  message?: string;
  visible?: boolean;
};

export function LoadingOverlay({ message, visible = true }: LoadingOverlayProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (!visible) return;

    // Bouncing ball animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(-24, { duration: 350, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );

    // Squash on landing
    scale.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 350, easing: Easing.out(Easing.quad) }),
        withTiming(1.15, { duration: 80, easing: Easing.linear }),
        withTiming(1, { duration: 270, easing: Easing.out(Easing.quad) }),
      ),
      -1,
      false,
    );

    // Shadow grows/shrinks with bounce height
    shadowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.1, { duration: 350 }),
        withTiming(0.4, { duration: 350 }),
      ),
      -1,
      false,
    );
  }, [visible]);

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scaleX: scale.value },
      { scaleY: 2 - scale.value }, // Inverse squash for stretch effect
    ],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: shadowOpacity.value,
    transform: [{ scaleX: 1 + (0.3 - shadowOpacity.value) }],
  }));

  if (!visible) return null;

  return (
    <View
      style={styles.overlay}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Loading'}
    >
      <View style={styles.content}>
        <View style={styles.bounceContainer}>
          <Animated.View style={[styles.ball, ballStyle]}>
            <Ionicons name="tennisball" size={36} color={Colors.opticYellow} />
          </Animated.View>
          <Animated.View style={[styles.shadow, shadowStyle]} />
        </View>
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 28, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  bounceContainer: {
    alignItems: 'center',
    height: 80,
    justifyContent: 'flex-end',
  },
  ball: {
    marginBottom: 8,
  },
  shadow: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.opticYellow,
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textDim,
  },
});
