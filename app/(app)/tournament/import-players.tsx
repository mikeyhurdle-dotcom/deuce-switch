import { useState, useCallback, useRef } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
const ImagePickerAvailable = true;
try {
  // ImagePicker is statically imported above
} catch {
  // Native module not available (e.g. Expo Go) — image picker disabled
}
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  SlideInRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/providers/AuthProvider';
import { Colors, Fonts, Spacing, Radius, Shadows, Duration, Alpha } from '../../../src/lib/constants';
import { Button } from '../../../src/components/ui/Button';
import type { Profile } from '../../../src/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────

type ExtractedPlayer = {
  name: string;
  matchedProfile: Profile | null;
  confidence: number; // 0-1 from OCR
  isNew: boolean;
};

type ProcessingStep = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  done: boolean;
  active: boolean;
};

type DetectedPlatform = 'playtomic' | 'padelmates' | 'nettla' | 'matchii' | 'unknown';

// ── Constants ──────────────────────────────────────────────────────────────

const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };

const PLATFORM_LABELS: Record<DetectedPlatform, string> = {
  playtomic: 'Playtomic',
  padelmates: 'Padel Mates',
  nettla: 'Nettla',
  matchii: 'Matchii',
  unknown: 'Screenshot',
};

const PLATFORM_COLORS: Record<DetectedPlatform, string> = {
  playtomic: '#00D4AA',
  padelmates: '#FF6B35',
  nettla: '#4A90D9',
  matchii: '#E91E63',
  unknown: Colors.textDim,
};

// ── Component ──────────────────────────────────────────────────────────────

export default function ImportPlayersScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ tournamentId?: string }>();

  // State
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedPlayers, setExtractedPlayers] = useState<ExtractedPlayer[]>([]);
  const [detectedPlatform, setDetectedPlatform] = useState<DetectedPlatform>('unknown');
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { label: 'Reading screenshot', icon: 'eye-outline', done: false, active: false },
    { label: 'Extracting player names', icon: 'people-outline', done: false, active: false },
    { label: 'Matching Smashd profiles', icon: 'checkmark-circle-outline', done: false, active: false },
  ]);
  const [manualName, setManualName] = useState('');
  const [hasResults, setHasResults] = useState(false);

  // ── Image Picker ──────────────────────────────────────────────────────

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!ImagePicker) {
      Alert.alert('Not Available', 'Image picker requires a native build. It will work in the installed app.');
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    };

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera access needed', 'Please enable camera access in Settings to take screenshots.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setScreenshotUri(asset.uri);
      processScreenshot(asset.base64!, asset.uri);
    }
  }, []);

  // ── OCR Processing ────────────────────────────────────────────────────

  const processScreenshot = useCallback(async (base64: string, uri: string) => {
    setProcessing(true);
    setHasResults(false);

    // Step 1: Reading screenshot
    updateStep(0, true, false);
    await delay(800);
    updateStep(0, false, true);

    // Step 2: Extracting player names
    updateStep(1, true, false);

    try {
      // Call Supabase Edge Function for OCR
      const { data, error } = await supabase.functions.invoke('ocr-extract-players', {
        body: {
          image_base64: base64,
          context: 'player_import',
        },
      });

      if (error) throw error;

      updateStep(1, false, true);

      // Step 3: Done — skip profile matching for now
      updateStep(2, false, true);

      const ocrNames: string[] = data?.players ?? [];
      const platform: DetectedPlatform = data?.platform ?? 'unknown';
      setDetectedPlatform(platform);

      // Map names directly without profile matching
      const players: ExtractedPlayer[] = ocrNames.map((name) => ({
        name,
        matchedProfile: null,
        confidence: data?.confidence ?? 0.8,
        isNew: true,
      }));

      setExtractedPlayers(players);
      setHasResults(true);
    } catch (err) {
      console.error('OCR processing failed:', err);

      // Fallback: show mock data for demo / when edge function isn't deployed
      updateStep(1, false, true);
      updateStep(2, true, false);
      await delay(600);
      updateStep(2, false, true);
      await delay(400);

      // Demo fallback — remove when edge function is live
      const demoPlayers: ExtractedPlayer[] = [
        { name: 'Unable to process', matchedProfile: null, confidence: 0, isNew: true },
      ];
      setExtractedPlayers(demoPlayers);
      setHasResults(true);

      Alert.alert(
        'OCR Not Available',
        'The screenshot processing service is not yet deployed. Players could not be extracted automatically.\n\nYou can add players manually below.',
      );
    } finally {
      setProcessing(false);
    }
  }, []);

  const matchPlayersToProfiles = async (names: string[]): Promise<ExtractedPlayer[]> => {
    const results: ExtractedPlayer[] = [];

    for (const name of names) {
      // Search by display_name (fuzzy-ish via ilike)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${name}%,username.ilike.%${name}%`)
        .limit(1);

      const matched = profiles && profiles.length > 0 ? profiles[0] : null;

      results.push({
        name,
        matchedProfile: matched,
        confidence: matched ? 0.9 : 0.5,
        isNew: !matched,
      });
    }

    return results;
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const updateStep = (index: number, active: boolean, done: boolean) => {
    setProcessingSteps(prev =>
      prev.map((step, i) =>
        i === index ? { ...step, active, done } : step,
      ),
    );
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const removePlayer = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExtractedPlayers(prev => prev.filter((_, i) => i !== index));
  };

  const addManualPlayer = () => {
    if (!manualName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExtractedPlayers(prev => [
      ...prev,
      {
        name: manualName.trim(),
        matchedProfile: null,
        confidence: 1,
        isNew: true,
      },
    ]);
    setManualName('');
  };

  const confirmPlayers = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const playerNames = extractedPlayers.map(p => p.name);
    const matchedIds = extractedPlayers
      .filter(p => p.matchedProfile)
      .map(p => p.matchedProfile!.id);

    // Navigate back to lobby with player data
    if (params.tournamentId) {
      router.replace({
        pathname: '/(app)/tournament/[id]/lobby',
        params: {
          id: params.tournamentId,
          importedPlayers: JSON.stringify(playerNames),
          matchedProfileIds: JSON.stringify(matchedIds),
        },
      });
    } else {
      router.back();
    }
  };

  const resetImport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreenshotUri(null);
    setExtractedPlayers([]);
    setHasResults(false);
    setProcessing(false);
    setDetectedPlatform('unknown');
    setProcessingSteps(prev => prev.map(s => ({ ...s, done: false, active: false })));
  };

  // ── Derived ───────────────────────────────────────────────────────────

  const matchedCount = extractedPlayers.filter(p => p.matchedProfile).length;
  const newCount = extractedPlayers.filter(p => p.isNew).length;
  const totalCount = extractedPlayers.length;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView testID="screen-import-players" style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Import Players',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.bodySemiBold },
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDotComplete]}>
              <Ionicons name="checkmark" size={14} color={Colors.darkBg} />
            </View>
            <View style={[styles.stepLine, styles.stepLineComplete]} />
            <View style={[styles.stepDot, styles.stepDotActive]}>
              <Text style={styles.stepDotText}>2</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepDot}>
              <Text style={styles.stepDotText}>3</Text>
            </View>
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabelDone}>Setup</Text>
            <Text style={styles.stepLabelActive}>Players</Text>
            <Text style={styles.stepLabel}>Review</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Players</Text>
          <Text style={styles.subtitle}>
            Import players from a booking app screenshot or add them manually
          </Text>
        </View>

        {/* Upload Zone — show when no results yet */}
        {!hasResults && !processing && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.uploadZone}>
            <View style={styles.uploadIcon}>
              <Ionicons name="camera-outline" size={40} color={Colors.opticYellow} />
            </View>
            <Text style={styles.uploadTitle}>Screenshot Import</Text>
            <Text style={styles.uploadDesc}>
              Take a photo or select a screenshot from Playtomic, Padel Mates, Nettla, or Matchii
            </Text>

            <View style={styles.uploadButtons}>
              <Pressable
                style={styles.uploadBtn}
                onPress={() => pickImage('camera')}
              >
                <Ionicons name="camera" size={22} color={Colors.opticYellow} />
                <Text style={styles.uploadBtnText}>Camera</Text>
              </Pressable>

              <Pressable
                style={styles.uploadBtn}
                onPress={() => pickImage('library')}
              >
                <Ionicons name="images" size={22} color={Colors.opticYellow} />
                <Text style={styles.uploadBtnText}>Photo Library</Text>
              </Pressable>
            </View>

            {/* Platform logos hint */}
            <View style={styles.platformHint}>
              <Text style={styles.platformHintText}>Supported platforms:</Text>
              <View style={styles.platformChips}>
                {(['playtomic', 'padelmates', 'nettla', 'matchii'] as DetectedPlatform[]).map(p => (
                  <View key={p} style={[styles.platformChip, { borderColor: PLATFORM_COLORS[p] }]}>
                    <Text style={[styles.platformChipText, { color: PLATFORM_COLORS[p] }]}>
                      {PLATFORM_LABELS[p]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Processing Overlay */}
        {processing && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.processingCard}>
            {/* Screenshot Preview */}
            {screenshotUri && (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: screenshotUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={styles.previewOverlay}>
                  <ActivityIndicator size="large" color={Colors.opticYellow} />
                </View>
              </View>
            )}

            {/* Processing Steps */}
            <View style={styles.stepsContainer}>
              {processingSteps.map((step, i) => (
                <Animated.View
                  key={step.label}
                  entering={FadeInDown.delay(i * 200).duration(300)}
                  style={styles.stepItem}
                >
                  <View
                    style={[
                      styles.stepIcon,
                      step.done && styles.stepIconDone,
                      step.active && styles.stepIconActive,
                    ]}
                  >
                    {step.active ? (
                      <ActivityIndicator size="small" color={Colors.opticYellow} />
                    ) : step.done ? (
                      <Ionicons name="checkmark" size={16} color={Colors.darkBg} />
                    ) : (
                      <Ionicons name={step.icon} size={16} color={Colors.textDim} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepText,
                      step.done && styles.stepTextDone,
                      step.active && styles.stepTextActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Results */}
        {hasResults && (
          <Animated.View entering={FadeIn.duration(400)}>
            {/* Screenshot Preview (small) */}
            {screenshotUri && (
              <Pressable style={styles.resultPreview} onPress={resetImport}>
                <Image
                  source={{ uri: screenshotUri }}
                  style={styles.resultPreviewImage}
                  resizeMode="cover"
                />
                <View style={styles.resultPreviewInfo}>
                  <View style={styles.resultPreviewBadge}>
                    <View style={[styles.platformDot, { backgroundColor: PLATFORM_COLORS[detectedPlatform] }]} />
                    <Text style={styles.resultPreviewPlatform}>
                      {PLATFORM_LABELS[detectedPlatform]}
                    </Text>
                  </View>
                  <Text style={styles.resultPreviewAction}>Tap to re-scan</Text>
                </View>
                <Ionicons name="refresh-outline" size={20} color={Colors.textDim} />
              </Pressable>
            )}

            {/* Summary Bar */}
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalCount}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>{matchedCount}</Text>
                <Text style={styles.summaryLabel}>Matched</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: Colors.warning }]}>{newCount}</Text>
                <Text style={styles.summaryLabel}>New</Text>
              </View>
            </View>

            {/* Player List */}
            <View style={styles.playerList}>
              {extractedPlayers.map((player, index) => (
                <Animated.View
                  key={`${player.name}-${index}`}
                  entering={SlideInRight.delay(index * 80).duration(300)}
                  style={[
                    styles.playerRow,
                    player.matchedProfile ? styles.playerRowMatched : styles.playerRowNew,
                  ]}
                >
                  {/* Avatar */}
                  <View
                    style={[
                      styles.playerAvatar,
                      {
                        backgroundColor: player.matchedProfile
                          ? Colors.violet
                          : 'rgba(245,158,11,0.15)',
                      },
                    ]}
                  >
                    {player.matchedProfile?.game_face_url ? (
                      <Image
                        source={{ uri: player.matchedProfile.game_face_url }}
                        style={styles.playerAvatarImage}
                      />
                    ) : (
                      <Text style={styles.playerAvatarText}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    {player.matchedProfile ? (
                      <View style={styles.playerStatusRow}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                        <Text style={styles.playerStatusMatched}>Profile linked</Text>
                        {player.matchedProfile.smashd_level != null && (
                          <View style={styles.levelBadge}>
                            <Text style={styles.levelBadgeText}>
                              Lvl {player.matchedProfile.smashd_level}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.playerStatusRow}>
                        <Ionicons name="sparkles" size={14} color={Colors.warning} />
                        <Text style={styles.playerStatusNew}>New to Smashd</Text>
                      </View>
                    )}
                  </View>

                  {/* Remove */}
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => removePlayer(index)}
                    hitSlop={12}
                  >
                    <Ionicons name="close" size={18} color={Colors.textDim} />
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            {/* Manual Add */}
            <View style={styles.manualAdd}>
              <Text style={styles.manualAddLabel}>Add player manually</Text>
              <View style={styles.manualAddRow}>
                <TextInput
                  testID="input-manual-player"
                  style={styles.manualInput}
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder="Player name"
                  placeholderTextColor={Colors.textMuted}
                  onSubmitEditing={addManualPlayer}
                  returnKeyType="done"
                />
                <Pressable
                  testID="btn-add-manual-player"
                  style={[styles.manualAddBtn, !manualName.trim() && styles.manualAddBtnDisabled]}
                  onPress={addManualPlayer}
                  disabled={!manualName.trim()}
                >
                  <Ionicons name="add" size={22} color={Colors.darkBg} />
                </Pressable>
              </View>
            </View>

            {/* Check-in Notification Card */}
            {newCount > 0 && (
              <Animated.View entering={FadeIn.delay(400).duration(300)} style={styles.notifCard}>
                <View style={styles.notifIcon}>
                  <Ionicons name="notifications-outline" size={20} color={Colors.aquaGreen} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>
                    {newCount} new player{newCount > 1 ? 's' : ''} will get a check-in notification
                  </Text>
                  <Text style={styles.notifDesc}>
                    They can claim their profile and join the tournament via the Smashd app
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Pro Tip */}
            <View style={styles.proTip}>
              <Ionicons name="bulb-outline" size={18} color={Colors.opticYellow} />
              <Text style={styles.proTipText}>
                Matched players will be pre-added to the lobby. New players get a ghost profile until they sign up.
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Floating CTA */}
      {hasResults && extractedPlayers.length > 0 && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.floatingCta}>
          <Button
            title={`Add ${totalCount} Player${totalCount !== 1 ? 's' : ''} to Tournament`}
            onPress={confirmPlayers}
            variant="primary"
            size="lg"
            style={styles.ctaButton}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing[4],
    paddingBottom: 120,
  },

  // Step Indicator
  stepIndicator: {
    marginBottom: Spacing[6],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  stepDotActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow10,
  },
  stepDotComplete: {
    borderColor: Colors.opticYellow,
    backgroundColor: Colors.opticYellow,
  },
  stepDotText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
  },
  stepLine: {
    height: 2,
    width: 48,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing[2],
  },
  stepLineComplete: {
    backgroundColor: Colors.opticYellow,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 50,
  },
  stepLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },
  stepLabelActive: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.opticYellow,
  },
  stepLabelDone: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    marginBottom: Spacing[6],
  },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
    lineHeight: 22,
  },

  // Upload Zone
  uploadZone: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing[6],
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  uploadIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Alpha.yellow08,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  uploadTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing[2],
  },
  uploadDesc: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing[5],
    paddingHorizontal: Spacing[4],
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow06,
  },
  uploadBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },
  platformHint: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  platformHintText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  platformChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    justifyContent: 'center',
  },
  platformChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  platformChipText: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },

  // Processing
  processingCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing[4],
  },
  previewContainer: {
    height: 200,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,15,28,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsContainer: {
    padding: Spacing[5],
    gap: Spacing[4],
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconActive: {
    backgroundColor: Alpha.yellow10,
    borderWidth: 1,
    borderColor: Colors.opticYellow,
  },
  stepIconDone: {
    backgroundColor: Colors.opticYellow,
  },
  stepText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
  },
  stepTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.opticYellow,
  },
  stepTextDone: {
    color: Colors.textSecondary,
  },

  // Result Preview (small strip)
  resultPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[4],
    gap: Spacing[3],
  },
  resultPreviewImage: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
  },
  resultPreviewInfo: {
    flex: 1,
    gap: Spacing[1],
  },
  resultPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultPreviewPlatform: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  resultPreviewAction: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },

  // Summary Bar
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    marginBottom: Spacing[5],
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },

  // Player List
  playerList: {
    gap: Spacing[2],
    marginBottom: Spacing[5],
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[3],
    borderLeftWidth: 3,
  },
  playerRowMatched: {
    borderLeftColor: Colors.success,
  },
  playerRowNew: {
    borderLeftColor: Colors.warning,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  playerAvatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  playerInfo: {
    flex: 1,
    gap: Spacing[1],
  },
  playerName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  playerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerStatusMatched: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.success,
  },
  playerStatusNew: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.warning,
  },
  levelBadge: {
    backgroundColor: Alpha.violet20,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: Spacing[1],
  },
  levelBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.violetLight,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Manual Add
  manualAdd: {
    marginBottom: Spacing[4],
  },
  manualAddLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
    marginBottom: Spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manualAddRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  manualInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manualAddBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualAddBtnDisabled: {
    opacity: 0.4,
  },

  // Notification Card
  notifCard: {
    flexDirection: 'row',
    backgroundColor: Alpha.aqua08,
    borderRadius: Radius.md,
    padding: Spacing[4],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Alpha.aqua20,
    marginBottom: Spacing[4],
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Alpha.aqua12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
    gap: Spacing[1],
  },
  notifTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.aquaGreen,
  },
  notifDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 18,
  },

  // Pro Tip
  proTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    backgroundColor: Alpha.yellow05,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Alpha.yellow10,
  },
  proTipText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
    lineHeight: 19,
  },

  // Floating CTA
  floatingCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    paddingTop: Spacing[3],
    backgroundColor: Colors.darkBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ctaButton: {
    width: '100%',
    ...Shadows.glowYellow,
  },
});
