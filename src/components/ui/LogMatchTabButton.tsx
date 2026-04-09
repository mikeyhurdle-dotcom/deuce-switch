import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Shadows } from '../../lib/constants';

type Props = {
  onPress: () => void;
  testID?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function LogMatchTabButton({ onPress, testID }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <AnimatedPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Log Match"
        style={[styles.button, animatedStyle]}
        onPressIn={() => {
          scale.value = withSpring(0.88, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
      >
        <Ionicons name="add" size={30} color={Colors.darkBg} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -14,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glowYellow,
  },
});
