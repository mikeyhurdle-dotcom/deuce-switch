import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import { AnimatedPressable, useSpringPress } from '../../hooks/useSpringPress';

function CTACard({
  icon,
  title,
  subtitle,
  borderColor,
  iconColor,
  testID,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  borderColor: string;
  iconColor: string;
  testID: string;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();

  return (
    <AnimatedPressable
      testID={testID}
      style={[styles.card, { borderColor }, animatedStyle]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.iconWrap, { backgroundColor: borderColor }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </AnimatedPressable>
  );
}

export function TournamentCTAs() {
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.row}>
      <CTACard
        icon="add-circle"
        title="Host"
        subtitle="Start a tournament"
        borderColor={Alpha.yellow15}
        iconColor={Colors.opticYellow}
        testID="btn-host-tournament"
        onPress={() => router.push('/tournament/create')}
      />
      <CTACard
        icon="qr-code-outline"
        title="Join"
        subtitle="Enter a code"
        borderColor={Alpha.aqua12}
        iconColor={Colors.aquaGreen}
        testID="btn-join-tournament"
        onPress={() => router.push('/(app)/join')}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[4],
  },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    gap: Spacing[1],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
