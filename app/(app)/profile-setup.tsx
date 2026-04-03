import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/providers/AuthProvider';
import { updateProfile } from '../../src/services/profile-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../src/lib/constants';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

export const PROFILE_SETUP_KEY = 'smashd_profile_setup_complete';

// ── Step Config ──────────────────────────────────────────────────────────────

type StepId = 'location' | 'level' | 'position' | 'gender';

const STEPS: StepId[] = ['location', 'level', 'position', 'gender'];

const STEP_META: Record<StepId, { title: string; subtitle: string; icon: string }> = {
  location: {
    title: 'Where do you play?',
    subtitle: 'Help us find tournaments and players near you.',
    icon: 'location-outline',
  },
  level: {
    title: "What's your level?",
    subtitle: 'We\'ll match you with similar players.',
    icon: 'trending-up-outline',
  },
  position: {
    title: 'Preferred court side?',
    subtitle: 'Left (revés), right (drive), or both.',
    icon: 'swap-horizontal-outline',
  },
  gender: {
    title: 'How should we list you?',
    subtitle: 'Used for Mixicano (mixed doubles) pairing.',
    icon: 'people-outline',
  },
};

const LEVELS = [
  { value: 1, label: 'Beginner', desc: 'Just getting started', color: Colors.aquaGreen },
  { value: 2, label: 'Intermediate', desc: '1–2 years playing', color: Colors.opticYellow },
  { value: 3, label: 'Advanced', desc: 'Compete regularly', color: Colors.violetLight },
  { value: 4, label: 'Expert', desc: 'Tournament veteran', color: Colors.coral },
];

const POSITIONS = [
  { value: 'left' as const, label: 'Left (Revés)', icon: 'arrow-back-outline' },
  { value: 'right' as const, label: 'Right (Drive)', icon: 'arrow-forward-outline' },
  { value: 'both' as const, label: 'No Preference', icon: 'swap-horizontal-outline' },
];

const GENDERS = [
  { value: 'M' as const, label: 'Male' },
  { value: 'F' as const, label: 'Female' },
  { value: 'Other' as const, label: 'Prefer not to say' },
];

// ── Main Component ───────────────────────────────────────────────────────────

export default function ProfileSetup() {
  const { user, refreshProfile } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [location, setLocation] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [position, setPosition] = useState<'left' | 'right' | 'both' | null>(null);
  const [gender, setGender] = useState<'M' | 'F' | 'Other' | null>(null);

  const step = STEPS[stepIndex];
  const meta = STEP_META[step];
  const isLast = stepIndex === STEPS.length - 1;

  const canProceed = (): boolean => {
    switch (step) {
      case 'location':
        return location.trim().length > 0;
      case 'level':
        return level !== null;
      case 'position':
        return position !== null;
      case 'gender':
        return gender !== null;
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      handleSave();
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem(PROFILE_SETUP_KEY, 'true');
    router.replace('/(app)/(tabs)/home');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        location: location.trim() || null,
        ...(level !== null && { smashd_level: level }),
        preferred_position: position,
        gender,
      });
      await AsyncStorage.setItem(PROFILE_SETUP_KEY, 'true');
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(app)/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView testID="screen-profile-setup" style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            {stepIndex > 0 ? (
              <Pressable onPress={handleBack} hitSlop={12}>
                <Ionicons name="arrow-back" size={22} color={Colors.textSecondary} />
              </Pressable>
            ) : (
              <View style={{ width: 22 }} />
            )}

            {/* Progress */}
            <View style={styles.progressRow}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressBar,
                    i <= stepIndex && styles.progressBarActive,
                  ]}
                />
              ))}
            </View>

            <Pressable onPress={handleSkip} hitSlop={12}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step Header */}
            <Animated.View
              key={step}
              entering={FadeIn.duration(200)}
              style={styles.stepHeader}
            >
              <View style={styles.stepIcon}>
                <Ionicons name={meta.icon as any} size={28} color={Colors.opticYellow} />
              </View>
              <Text style={styles.stepTitle}>{meta.title}</Text>
              <Text style={styles.stepSubtitle}>{meta.subtitle}</Text>
            </Animated.View>

            {/* Step Content */}
            <Animated.View
              key={`content-${step}`}
              entering={FadeInDown.delay(100).springify()}
              style={styles.stepContent}
            >
              {step === 'location' && (
                <Input
                  testID="input-location"
                  label="CITY OR POSTCODE"
                  placeholder="e.g. London, SW1A 1AA"
                  value={location}
                  onChangeText={setLocation}
                  autoCapitalize="words"
                  autoFocus
                />
              )}

              {step === 'level' && (
                <View style={styles.optionGrid}>
                  {LEVELS.map((l) => (
                    <Pressable
                      key={l.value}
                      testID={`chip-level-${l.value}`}
                      style={[
                        styles.levelCard,
                        level === l.value && [
                          styles.levelCardActive,
                          { borderColor: l.color },
                        ],
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setLevel(l.value);
                      }}
                    >
                      <Text
                        style={[
                          styles.levelLabel,
                          level === l.value && { color: l.color },
                        ]}
                      >
                        {l.label}
                      </Text>
                      <Text style={styles.levelDesc}>{l.desc}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {step === 'position' && (
                <View style={styles.optionGrid}>
                  {POSITIONS.map((p) => (
                    <Pressable
                      key={p.value}
                      testID={`chip-position-${p.value}`}
                      style={[
                        styles.positionCard,
                        position === p.value && styles.positionCardActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPosition(p.value);
                      }}
                    >
                      <Ionicons
                        name={p.icon as any}
                        size={24}
                        color={
                          position === p.value
                            ? Colors.opticYellow
                            : Colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.positionLabel,
                          position === p.value && styles.positionLabelActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {step === 'gender' && (
                <View style={styles.optionGrid}>
                  {GENDERS.map((g) => (
                    <Pressable
                      key={g.value}
                      testID={`chip-gender-${g.value}`}
                      style={[
                        styles.genderCard,
                        gender === g.value && styles.genderCardActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setGender(g.value);
                      }}
                    >
                      <Text
                        style={[
                          styles.genderLabel,
                          gender === g.value && styles.genderLabelActive,
                        ]}
                      >
                        {g.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Bottom CTA */}
          <View style={styles.ctaArea}>
            <Button
              testID="btn-setup-next"
              title={isLast ? 'FINISH SETUP' : 'CONTINUE'}
              onPress={handleNext}
              disabled={!canProceed()}
              loading={saving}
              variant="primary"
              size="lg"
            />
            <Text style={styles.stepCount}>
              {stepIndex + 1} of {STEPS.length}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.surface,
  },
  progressBarActive: {
    backgroundColor: Colors.opticYellow,
  },
  skipText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[8],
  },
  stepHeader: {
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[8],
  },
  stepIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Alpha.yellow08,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  stepTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    maxWidth: 280,
  },
  stepContent: {
    gap: Spacing[4],
  },
  optionGrid: {
    gap: Spacing[3],
  },

  // Level cards
  levelCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.surface,
    gap: 4,
  },
  levelCardActive: {
    backgroundColor: Alpha.yellow08,
  },
  levelLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  levelDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Position cards
  positionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  positionCardActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow08,
  },
  positionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  positionLabelActive: {
    color: Colors.opticYellow,
  },

  // Gender cards
  genderCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.surface,
    alignItems: 'center',
  },
  genderCardActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow08,
  },
  genderLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  genderLabelActive: {
    color: Colors.opticYellow,
  },

  // CTA
  ctaArea: {
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[6],
    paddingTop: Spacing[3],
    gap: Spacing[3],
    alignItems: 'center',
  },
  stepCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
