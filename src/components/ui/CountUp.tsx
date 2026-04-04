import { useEffect } from 'react';
import { StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Fonts } from '../../lib/constants';

const AnimatedText = Animated.createAnimatedComponent(
  require('react-native').TextInput,
);

type CountUpProps = {
  /** Target numeric value */
  value: number;
  /** Duration in ms (default 600) */
  duration?: number;
  /** Number of decimal places (default 0) */
  decimals?: number;
  /** Suffix string (e.g. '%') */
  suffix?: string;
  /** Text style */
  style?: StyleProp<TextStyle>;
};

export function CountUp({
  value,
  duration = 600,
  decimals = 0,
  suffix = '',
  style,
}: CountUpProps) {
  const current = useSharedValue(0);

  useEffect(() => {
    current.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, current]);

  const animatedProps = useAnimatedProps(() => {
    const display =
      decimals > 0
        ? current.value.toFixed(decimals)
        : Math.round(current.value).toString();
    return {
      text: display + suffix,
      defaultValue: display + suffix,
    } as any;
  });

  return (
    <AnimatedText
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps}
      style={StyleSheet.flatten([
        {
          fontFamily: Fonts.bodyBold,
          fontSize: 22,
          padding: 0,
          fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
        },
        style,
      ])}
    />
  );
}
