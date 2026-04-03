import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Duration, Radius } from '../../lib/constants';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: Duration.glacial, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: Duration.glacial, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** A skeleton that mimics a tournament card in history / leaderboard. */
export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Skeleton width="60%" height={18} />
        <Skeleton width={60} height={22} borderRadius={11} />
      </View>
      <View style={styles.cardRow}>
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={14} />
        <Skeleton width={90} height={14} />
      </View>
    </View>
  );
}

/** Multiple card skeletons for a list loading state. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.surfaceLight,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  list: {
    gap: 12,
  },
});
