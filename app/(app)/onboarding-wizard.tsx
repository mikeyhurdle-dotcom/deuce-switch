import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/providers/AuthProvider';
import { updateProfile } from '../../src/services/profile-service';
import { fetchFeaturedVideos, extractYouTubeId, getYouTubeThumbnail } from '../../src/services/training-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../src/lib/constants';
import { Input } from '../../src/components/ui/Input';
import { ToolSelectionGrid } from '../../src/components/log-match/ToolSelectionGrid';
import { SmashdLogo } from '../../src/components/ui/SmashdLogo';
import type { TrackingTool, TrainingVideo } from '../../src/lib/types';

export const ONBOARDING_WIZARD_KEY = 'smashd_onboarding_wizard_complete';

const TOTAL_STEPS = 7;

// ── Level/Position Constants ────────────────────────────────────────────────
const LEVELS = [
  { value: 1, label: 'Beginner', color: Colors.aquaGreen },
  { value: 2, label: 'Intermediate', color: Colors.opticYellow },
  { value: 3, label: 'Advanced', color: Colors.violetLight },
  { value: 4, label: 'Expert', color: Colors.coral },
];

const POSITIONS = [
  { value: 'left' as const, label: 'Left', icon: 'arrow-back-outline' },
  { value: 'right' as const, label: 'Right', icon: 'arrow-forward-outline' },
  { value: 'both' as const, label: 'Both', icon: 'swap-horizontal-outline' },
];

// ── Progress Dots ───────────────────────────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && styles.dotActive,
            i < current && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 2 — Profile fields
  const [location, setLocation] = useState(profile?.location ?? '');
  const [level, setLevel] = useState<number | null>(profile?.smashd_level ?? null);
  const [position, setPosition] = useState<'left' | 'right' | 'both' | null>(
    profile?.preferred_position ?? null,
  );
  const [profileError, setProfileError] = useState<string | null>(null);

  // Step 3 — Tools
  const [selectedTools, setSelectedTools] = useState<TrackingTool[]>(
    profile?.tracking_tools ?? [],
  );

  // Step 5 — Featured video
  const [featuredVideo, setFeaturedVideo] = useState<TrainingVideo | null>(null);

  useEffect(() => {
    fetchFeaturedVideos()
      .then((vids) => { if (vids.length > 0) setFeaturedVideo(vids[0]); })
      .catch(() => {});
  }, []);

  const handleToolToggle = useCallback((tool: TrackingTool) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  }, []);

  const saveProfileStep = async () => {
    if (!user) return;
    if (!location.trim() || !level || !position) {
      setProfileError('Please fill in all fields.');
      return;
    }
    setProfileError(null);
    setSaving(true);
    try {
      await updateProfile(user.id, {
        location: location.trim(),
        smashd_level: level,
        preferred_position: position,
      });
      await refreshProfile();
      next();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const saveToolsStep = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { tracking_tools: selectedTools });
      await refreshProfile();
      next();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_WIZARD_KEY, 'true');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(app)/(tabs)/home');
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // ── Render Steps ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // Step 0 — Welcome
      case 0:
        return (
          <Animated.View key="welcome" entering={FadeIn.duration(400)} style={styles.centredStep}>
            <SmashdLogo size={64} />
            <Text style={styles.welcomeTitle}>Welcome to SMASHD</Text>
            <Text style={styles.welcomeSub}>
              The padel tournament engine. Track stats, compete with friends, and level up your game.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={next}>
              <Text style={styles.primaryBtnText}>Let's Go</Text>
            </Pressable>
          </Animated.View>
        );

      // Step 1 — Profile basics
      case 1:
        return (
          <Animated.View key="profile" entering={FadeInDown.duration(300)} style={styles.formStep}>
            <Text style={styles.stepTitle}>Set up your profile</Text>
            <Text style={styles.stepSub}>Help us find tournaments near you.</Text>

            <Input
              testID="input-onboard-location"
              label="Location"
              placeholder="City or postcode"
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.fieldLabel}>Your Level</Text>
            <View style={styles.chipRow}>
              {LEVELS.map((l) => (
                <Pressable
                  key={l.value}
                  style={[styles.chip, level === l.value && { backgroundColor: l.color + '20', borderColor: l.color }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLevel(l.value); }}
                >
                  <Text style={[styles.chipText, level === l.value && { color: l.color }]}>{l.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Preferred Side</Text>
            <View style={styles.chipRow}>
              {POSITIONS.map((p) => (
                <Pressable
                  key={p.value}
                  style={[styles.chip, position === p.value && styles.chipActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPosition(p.value); }}
                >
                  <Ionicons name={p.icon as any} size={14} color={position === p.value ? Colors.opticYellow : Colors.textMuted} />
                  <Text style={[styles.chipText, position === p.value && styles.chipTextActive]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>

            {profileError && (
              <Text style={styles.errorText}>{profileError}</Text>
            )}

            <Pressable
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              onPress={saveProfileStep}
              disabled={saving}
            >
              <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Continue'}</Text>
            </Pressable>
          </Animated.View>
        );

      // Step 2 — Tools
      case 2:
        return (
          <Animated.View key="tools" entering={FadeInDown.duration(300)} style={styles.formStep}>
            <Text style={styles.stepTitle}>How do you track your padel?</Text>
            <Text style={styles.stepSub}>Select the apps you use — we'll personalise your imports.</Text>
            <ToolSelectionGrid selected={selectedTools} onToggle={handleToolToggle} />
            <Pressable
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              onPress={saveToolsStep}
              disabled={saving}
            >
              <Text style={styles.primaryBtnText}>
                {saving ? 'Saving...' : selectedTools.length > 0 ? 'Continue' : 'Skip'}
              </Text>
            </Pressable>
          </Animated.View>
        );

      // Step 3 — First match
      case 3:
        return (
          <Animated.View key="match" entering={FadeInDown.duration(300)} style={styles.centredStep}>
            <View style={styles.iconRing}>
              <Ionicons name="create-outline" size={36} color={Colors.opticYellow} />
            </View>
            <Text style={styles.stepTitle}>Log your first match</Text>
            <Text style={styles.stepSub}>Record a recent game — even just a friendly. Your stats start here.</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => { router.push('/(app)/log-match' as any); }}
            >
              <Text style={styles.primaryBtnText}>Log a Match</Text>
            </Pressable>
            <Pressable style={styles.skipBtn} onPress={next}>
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </Pressable>
          </Animated.View>
        );

      // Step 4 — Coach video
      case 4: {
        const videoId = featuredVideo ? extractYouTubeId(featuredVideo.youtube_url) : null;
        const thumb = videoId ? getYouTubeThumbnail(videoId) : null;
        return (
          <Animated.View key="coach" entering={FadeInDown.duration(300)} style={styles.centredStep}>
            <View style={styles.iconRing}>
              <Ionicons name="videocam" size={36} color={Colors.aquaGreen} />
            </View>
            <Text style={styles.stepTitle}>Improve your game</Text>
            <Text style={styles.stepSub}>Watch coaching videos from top padel coaches — free inside the app.</Text>
            {thumb && (
              <Pressable
                style={styles.videoThumb}
                onPress={() => {
                  if (featuredVideo) router.push(`/(app)/video/${featuredVideo.id}` as any);
                  else next();
                }}
              >
                <Image source={{ uri: thumb }} style={styles.videoThumbImage} />
                <View style={styles.playOverlay}>
                  <Ionicons name="play" size={24} color="#FFFFFF" />
                </View>
              </Pressable>
            )}
            <Pressable style={styles.skipBtn} onPress={next}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>
          </Animated.View>
        );
      }

      // Step 5 — Host tournament
      case 5:
        return (
          <Animated.View key="host" entering={FadeInDown.duration(300)} style={styles.centredStep}>
            <View style={styles.iconRing}>
              <Ionicons name="trophy" size={36} color={Colors.violet} />
            </View>
            <Text style={styles.stepTitle}>Host a tournament</Text>
            <Text style={styles.stepSub}>
              Create your first Americano in seconds — invite friends, play, and track results live.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => { router.push('/tournament/create' as any); }}
            >
              <Text style={styles.primaryBtnText}>Create Tournament</Text>
            </Pressable>
            <Pressable style={styles.skipBtn} onPress={next}>
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </Pressable>
          </Animated.View>
        );

      // Step 6 — Done
      case 6:
        return (
          <Animated.View key="done" entering={FadeIn.duration(500)} style={styles.centredStep}>
            <View style={styles.iconRing}>
              <Ionicons name="checkmark-done-circle" size={48} color={Colors.opticYellow} />
            </View>
            <Text style={styles.welcomeTitle}>You're all set!</Text>
            <Text style={styles.welcomeSub}>
              Your profile is ready. Start playing, tracking, and competing.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={finish}>
              <Text style={styles.primaryBtnText}>Go to Home</Text>
            </Pressable>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView testID="screen-onboarding-wizard" style={styles.safe}>
        {/* Top bar */}
        <View style={styles.topBar}>
          {step > 0 && step < TOTAL_STEPS - 1 ? (
            <Pressable onPress={back} hitSlop={12} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
          <ProgressDots current={step} total={TOTAL_STEPS} />
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
  dotActive: {
    backgroundColor: Colors.opticYellow,
    width: 20,
  },
  dotDone: {
    backgroundColor: Colors.opticYellow,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing[5],
  },
  centredStep: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
    paddingVertical: Spacing[8],
  },
  formStep: {
    gap: Spacing[4],
  },
  welcomeTitle: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  welcomeSub: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  stepTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  stepSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    lineHeight: 20,
    marginBottom: Spacing[2],
  },
  fieldLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingVertical: 8,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Alpha.yellow08,
    borderColor: Alpha.yellow20,
  },
  chipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: Colors.opticYellow,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  videoThumbImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneEmoji: {
    fontSize: 56,
  },
  primaryBtn: {
    backgroundColor: Colors.opticYellow,
    borderRadius: Radius.md,
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[8],
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.darkBg,
  },
  skipBtn: {
    paddingVertical: Spacing[2],
  },
  skipBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textMuted,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.error,
    alignSelf: 'stretch',
  },
});
