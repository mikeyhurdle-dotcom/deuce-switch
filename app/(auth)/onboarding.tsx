import { useState, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Alpha, Colors, Fonts, Spacing, Radius } from '../../src/lib/constants';

// ── Config ───────────────────────────────────────────────────────────────────
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type IconName = keyof typeof Ionicons.glyphMap;

// ── Step Data ────────────────────────────────────────────────────────────────
type Feature = {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
};

type OnboardingStep = {
  logoStep?: boolean;         // Show SMASHD logo instead of emoji
  emoji?: string;
  headline: string;
  tagline: string;
  features?: Feature[];
};

const STEPS: OnboardingStep[] = [
  {
    logoStep: true,
    headline: 'SMASHD',
    tagline: 'Your padel community hub.\nTrack. Compete. Connect.',
    features: [
      {
        icon: 'flash',
        iconColor: Colors.opticYellow,
        iconBg: Alpha.yellow08,
        title: 'Run & Join Americanos',
        desc: 'Live scoring, auto-generated rounds, instant results',
      },
      {
        icon: 'bar-chart',
        iconColor: Colors.violet,
        iconBg: Alpha.violet08,
        title: 'Track Your Stats',
        desc: 'Import matches, build your profile, climb the ranks',
      },
      {
        icon: 'search',
        iconColor: Colors.aquaGreen,
        iconBg: Alpha.aqua08,
        title: 'Find Local Events',
        desc: 'Discover Americanos near you, set alerts, never miss out',
      },
    ],
  },
  {
    emoji: '⚡',
    headline: 'Instant Tournaments',
    tagline:
      'Create Americano, Mexicano, or Team tournaments in seconds.',
    features: [
      {
        icon: 'people',
        iconColor: Colors.opticYellow,
        iconBg: Alpha.yellow08,
        title: 'Auto-Generated Rounds',
        desc: 'Smart pairing ensures fair, varied matchups every round',
      },
      {
        icon: 'trophy',
        iconColor: Colors.violet,
        iconBg: Alpha.violet08,
        title: 'Live Leaderboard',
        desc: 'Real-time standings updated as scores come in',
      },
    ],
  },
  {
    emoji: '📊',
    headline: 'Own Your Stats',
    tagline:
      'Every match counts. See your win rate, streaks, and history.',
    features: [
      {
        icon: 'trending-up',
        iconColor: Colors.aquaGreen,
        iconBg: Alpha.aqua08,
        title: 'Performance Tracking',
        desc: 'Win rate, points per game, form trends over time',
      },
      {
        icon: 'medal',
        iconColor: Colors.opticYellow,
        iconBg: Alpha.yellow08,
        title: 'Achievements & Levels',
        desc: 'Earn badges, level up, and show off your progress',
      },
    ],
  },
  {
    emoji: '🤝',
    headline: 'Build Your Network',
    tagline:
      'Connect with players you meet on court. Find partners, grow your community.',
    features: [
      {
        icon: 'person-add',
        iconColor: Colors.violet,
        iconBg: Alpha.violet08,
        title: 'Connect After Matches',
        desc: 'Add players from tournaments directly to your network',
      },
      {
        icon: 'location',
        iconColor: Colors.aquaGreen,
        iconBg: Alpha.aqua08,
        title: 'Club Discovery',
        desc: 'Find padel clubs near you and follow for event alerts',
      },
    ],
  },
];

// ── Feature Row ──────────────────────────────────────────────────────────────
function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: feature.iconBg }]}>
        <Ionicons name={feature.icon} size={22} color={feature.iconColor} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDesc}>{feature.desc}</Text>
      </View>
    </View>
  );
}

// ── Progress Dots ────────────────────────────────────────────────────────────
function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current && styles.dotDone,
            i === current && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      router.replace('/(auth)/sign-up');
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLast]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/sign-in');
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={{ width: 40 }} />
          <ProgressDots total={STEPS.length} current={currentStep} />
          <Pressable onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Step Content */}
        <Animated.View
          key={currentStep}
          entering={FadeIn.duration(250)}
          style={styles.content}
        >
          {/* Logo or Emoji */}
          {step.logoStep ? (
            <Text style={styles.logoText}>SMASHD</Text>
          ) : (
            <Text style={styles.emoji}>{step.emoji}</Text>
          )}

          {/* Headline */}
          {!step.logoStep && (
            <Text style={styles.headline}>{step.headline}</Text>
          )}

          {/* Tagline */}
          <Text style={styles.tagline}>{step.tagline}</Text>

          {/* Feature Rows */}
          {step.features && (
            <View style={styles.featuresContainer}>
              {step.features.map((f, i) => (
                <FeatureRow key={i} feature={f} />
              ))}
            </View>
          )}
        </Animated.View>

        {/* Bottom CTA */}
        <View style={styles.ctaArea}>
          <AnimatedPressable
            style={[styles.ctaButton, animatedStyle]}
            onPressIn={() => {
              scale.value = withSpring(0.97, SPRING_CONFIG);
            }}
            onPressOut={() => {
              scale.value = withSpring(1, SPRING_CONFIG);
            }}
            onPress={handleNext}
          >
            <Text style={styles.ctaText}>
              {currentStep === 0
                ? 'Get Started'
                : isLast
                  ? "Let's Go!"
                  : 'Next'}
            </Text>
          </AnimatedPressable>

          <Pressable onPress={handleSkip} hitSlop={8}>
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[6],
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[5],
  },
  skipText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    width: 40,
    textAlign: 'right',
  },

  // Progress Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
  dotActive: {
    backgroundColor: Colors.opticYellow,
    width: 24,
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: Colors.opticYellow,
  },

  // Content
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing[10],
  },
  logoText: {
    fontFamily: Fonts.mono,
    fontSize: 44,
    color: Colors.opticYellow,
    textAlign: 'center',
    letterSpacing: 2,
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing[4],
  },
  headline: {
    fontFamily: Fonts.bodyBold,
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing[3],
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing[3],
    maxWidth: 300,
  },

  // Features
  featuresContainer: {
    width: '100%',
    marginTop: Spacing[10],
    gap: Spacing[5],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  featureDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // CTA
  ctaArea: {
    paddingBottom: Spacing[8],
    gap: Spacing[4],
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: Colors.opticYellow,
    paddingVertical: Spacing[4],
    borderRadius: Radius.md + 2,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.darkBg,
  },
  signInText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  signInLink: {
    color: Colors.opticYellow,
    fontFamily: Fonts.bodySemiBold,
  },
});
