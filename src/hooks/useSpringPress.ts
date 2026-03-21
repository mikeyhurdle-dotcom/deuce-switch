/**
 * useSpringPress — Shared spring-based press animation hook
 *
 * Provides scale-down feedback on press for any Pressable/AnimatedPressable.
 * Used across Settings, Lobby, Organiser, Join, Post Detail, and History screens.
 *
 * "Strength before weakness." — but also, spring before dampening.
 */

import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };

export function useSpringPress(scaleTo = 0.97) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => {
    scale.value = withSpring(scaleTo, SPRING_CONFIG);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };
  return { animatedStyle, onPressIn, onPressOut };
}
