import { useState, useCallback } from 'react';
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
  Switch,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/AuthProvider';
import { Colors, Fonts, Spacing, Radius, Shadows, Alpha } from '../../src/lib/constants';
import { Button } from '../../src/components/ui/Button';
import type {
  OCRMatch,
  OCRMatchImportResult,
  DetectedPlatform,
  MatchType,
  SetScore,
} from '../../src/lib/types';
import {
  matchPlayerProfiles,
  saveImportedMatches,
  type ConfirmedMatch,
} from '../../src/services/match-import-service';

// ── Types ──────────────────────────────────────────────────────────────────

type ReviewMatch = OCRMatch & {
  selected: boolean;
  matchType: MatchType;
  scoreEdited: boolean;
  intensity: 'casual' | 'competitive' | 'intense' | null;
  conditions: 'indoor' | 'outdoor' | null;
  courtSide: 'left' | 'right' | 'both' | null;
  editableRatings: Record<string, string>;
};

type ProcessingStep = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  done: boolean;
  active: boolean;
};

// ── Constants ──────────────────────────────────────────────────────────────

const OCR_TIMEOUT_MS = 60_000;
const MAX_IMAGE_BASE64_BYTES = 5 * 1024 * 1024; // 5 MB

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

export default function ImportMatchesScreen() {
  const { user, profile } = useAuth();

  // State
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<DetectedPlatform>('unknown');
  const [platformHint, setPlatformHint] = useState<DetectedPlatform | null>(null);
  const [reviewMatches, setReviewMatches] = useState<ReviewMatch[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { label: 'Reading screenshot', icon: 'eye-outline', done: false, active: false },
    { label: 'Extracting match data', icon: 'stats-chart-outline', done: false, active: false },
    { label: 'Identifying your results', icon: 'person-outline', done: false, active: false },
  ]);

  // ── Image Picker ──────────────────────────────────────────────────────

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    };

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera access needed', 'Please enable camera access in Settings.');
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setScreenshotUri(asset.uri);
      processScreenshot(asset.base64!);
    }
  }, [platformHint, profile]);

  // ── OCR Processing ────────────────────────────────────────────────────

  const processScreenshot = useCallback(async (base64: string) => {
    setProcessing(true);
    setHasResults(false);
    setOcrError(null);

    // Image size validation — block if base64 exceeds 5 MB
    const base64ByteLength = Math.ceil(base64.length * 0.75);
    if (base64ByteLength > MAX_IMAGE_BASE64_BYTES) {
      const shouldContinue = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Image Too Large',
          `This image is ~${Math.round(base64ByteLength / (1024 * 1024))}MB. Screenshots over 5MB may fail or be very slow. Consider cropping or using a smaller screenshot.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Try Anyway', style: 'default', onPress: () => resolve(true) },
          ],
          { cancelable: false },
        );
      });
      if (!shouldContinue) {
        setProcessing(false);
        return;
      }
    }

    // Step 1: Reading screenshot
    updateStep(0, true, false);
    await delay(600);
    updateStep(0, false, true);

    // Step 2: Extracting match data
    updateStep(1, true, false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

    try {
      const { data, error } = await supabase.functions.invoke('ocr-extract-players', {
        body: {
          image_base64: base64,
          context: 'match_import',
          user_display_name: profile?.display_name ?? null,
          platform_hint: platformHint ?? undefined,
        },
        signal: controller.signal as AbortSignal,
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      // Check for error payloads from the edge function itself
      if (data?.error) {
        throw new Error(data.error);
      }

      updateStep(1, false, true);

      // Step 3: Identifying results
      updateStep(2, true, false);
      await delay(400);
      updateStep(2, false, true);

      const result = data as OCRMatchImportResult;
      setDetectedPlatform(result.platform ?? 'unknown');

      // Convert OCR matches to review matches
      const matches: ReviewMatch[] = (result.matches ?? []).map((m) => {
        // Build editable ratings from OCR-detected ratings or empty for each player
        const allPlayers = [...(m.team_a ?? []), ...(m.team_b ?? [])];
        const editableRatings: Record<string, string> = {};
        for (const name of allPlayers) {
          editableRatings[name] = m.ratings?.[name] != null ? String(m.ratings[name]) : '';
        }
        return {
          ...m,
          selected: true,
          intensity: null,
          conditions: null,
          courtSide: null,
          matchType: m.match_type_hint ?? 'competitive',
          scoreEdited: false,
          editableRatings,
        };
      });

      setReviewMatches(matches);
      setHasResults(true);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error('OCR processing failed:', err);
      updateStep(1, false, false);
      updateStep(2, false, false);

      const isTimeout =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError');

      const errorMessage = isTimeout
        ? 'OCR took too long — try a smaller screenshot or try again.'
        : err instanceof Error
          ? err.message
          : 'Could not extract match data from this screenshot. Try a clearer screenshot of your match history.';

      setOcrError(errorMessage);

      Alert.alert('Import Failed', errorMessage);
    } finally {
      setProcessing(false);
    }
  }, [profile, platformHint]);

  // ── Match Editing ─────────────────────────────────────────────────────

  const toggleMatchSelection = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReviewMatches((prev) =>
      prev.map((m, i) => (i === index ? { ...m, selected: !m.selected } : m)),
    );
  };

  const toggleMatchType = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReviewMatches((prev) =>
      prev.map((m, i) =>
        i === index
          ? { ...m, matchType: m.matchType === 'competitive' ? 'friendly' : 'competitive' }
          : m,
      ),
    );
  };

  const cycleIntensity = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const order: Array<'casual' | 'competitive' | 'intense' | null> = [null, 'casual', 'competitive', 'intense'];
    setReviewMatches((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const curr = order.indexOf(m.intensity);
        return { ...m, intensity: order[(curr + 1) % order.length] };
      }),
    );
  };

  const cycleConditions = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const order: Array<'indoor' | 'outdoor' | null> = [null, 'indoor', 'outdoor'];
    setReviewMatches((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const curr = order.indexOf(m.conditions);
        return { ...m, conditions: order[(curr + 1) % order.length] };
      }),
    );
  };

  const cycleCourtSide = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const order: Array<'left' | 'right' | 'both' | null> = [null, 'left', 'right', 'both'];
    setReviewMatches((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const curr = order.indexOf(m.courtSide);
        return { ...m, courtSide: order[(curr + 1) % order.length] };
      }),
    );
  };

  const updateSetScore = (matchIndex: number, setIndex: number, team: 'team_a' | 'team_b', delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReviewMatches((prev) =>
      prev.map((m, mi) => {
        if (mi !== matchIndex) return m;
        const newSets = m.sets.map((s, si) => {
          if (si !== setIndex) return s;
          const newVal = Math.max(0, Math.min(99, s[team] + delta));
          return { ...s, [team]: newVal };
        });
        // Recompute won based on new scores
        const userTeam = m.user_team;
        let newWon = m.won;
        if (userTeam) {
          const totalA = newSets.reduce((sum, s) => sum + s.team_a, 0);
          const totalB = newSets.reduce((sum, s) => sum + s.team_b, 0);
          newWon = userTeam === 'a' ? totalA > totalB : totalB > totalA;
        }
        return { ...m, sets: newSets, won: newWon, scoreEdited: true };
      }),
    );
  };

  const updatePlayerRating = (matchIndex: number, playerName: string, value: string) => {
    setReviewMatches((prev) =>
      prev.map((m, i) => {
        if (i !== matchIndex) return m;
        return { ...m, editableRatings: { ...m.editableRatings, [playerName]: value } };
      }),
    );
  };

  const addSet = (matchIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReviewMatches((prev) =>
      prev.map((m, i) => {
        if (i !== matchIndex) return m;
        return { ...m, sets: [...m.sets, { team_a: 0, team_b: 0 }], scoreEdited: true };
      }),
    );
  };

  const removeSet = (matchIndex: number, setIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReviewMatches((prev) =>
      prev.map((m, i) => {
        if (i !== matchIndex || m.sets.length <= 1) return m;
        const newSets = m.sets.filter((_, si) => si !== setIndex);
        // Recompute won
        const userTeam = m.user_team;
        let newWon = m.won;
        if (userTeam) {
          const totalA = newSets.reduce((sum, s) => sum + s.team_a, 0);
          const totalB = newSets.reduce((sum, s) => sum + s.team_b, 0);
          newWon = userTeam === 'a' ? totalA > totalB : totalB > totalA;
        }
        return { ...m, sets: newSets, won: newWon, scoreEdited: true };
      }),
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      const selectedMatches = reviewMatches.filter((m) => m.selected);

      // Build confirmed matches with profile matching
      const allNames = new Set<string>();
      for (const m of selectedMatches) {
        m.team_a.forEach((n) => allNames.add(n));
        m.team_b.forEach((n) => allNames.add(n));
      }

      const profileMap = await matchPlayerProfiles(
        [...allNames],
        detectedPlatform,
      );

      const confirmed: ConfirmedMatch[] = selectedMatches.map((m) => ({
        date: m.date,
        time: m.time,
        venue: m.venue,
        platform_source: detectedPlatform,
        sets: m.sets,
        team_a_players: m.team_a.map((name) => ({
          name,
          profileId: profileMap.get(name)?.id ?? null,
        })),
        team_b_players: m.team_b.map((name) => ({
          name,
          profileId: profileMap.get(name)?.id ?? null,
        })),
        user_team: m.user_team ?? 'a',
        won: m.won ?? false,
        match_type: m.matchType,
        court_side: m.courtSide ?? null,
        intensity: m.intensity ?? null,
        conditions: m.conditions ?? null,
        score_edited: m.scoreEdited,
        ratings: Object.fromEntries(
          Object.entries(m.editableRatings)
            .filter(([_, v]) => v.trim() !== '')
            .map(([k, v]) => [k, parseFloat(v)])
            .filter(([_, v]) => !isNaN(v as number))
        ),
      }));

      const result = await saveImportedMatches(user.id, confirmed);

      Alert.alert(
        'Matches Imported',
        `${result.saved} match${result.saved !== 1 ? 'es' : ''} saved to your profile.${result.ratingsRecorded > 0 ? ` ${result.ratingsRecorded} rating${result.ratingsRecorded !== 1 ? 's' : ''} recorded.` : ''}`,
        [{ text: 'View Stats', onPress: () => router.replace('/(app)/(tabs)/stats') }],
      );
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert('Save Failed', 'Could not save matches. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, reviewMatches, detectedPlatform]);

  // ── Helpers ───────────────────────────────────────────────────────────

  const updateStep = (index: number, active: boolean, done: boolean) => {
    setProcessingSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, active, done } : step)),
    );
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const resetImport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreenshotUri(null);
    setReviewMatches([]);
    setHasResults(false);
    setProcessing(false);
    setOcrError(null);
    setDetectedPlatform('unknown');
    setProcessingSteps((prev) => prev.map((s) => ({ ...s, done: false, active: false })));
  };

  // ── Derived ───────────────────────────────────────────────────────────

  const selectedCount = reviewMatches.filter((m) => m.selected).length;
  const totalCount = reviewMatches.length;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView testID="screen-import-matches" style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Import Matches',
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Import Match History</Text>
          <Text style={styles.subtitle}>
            Screenshot your match history from any padel app and we'll extract your results
          </Text>
        </View>

        {/* Upload Zone */}
        {!hasResults && !processing && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.uploadZone}>
            <View style={styles.uploadIcon}>
              <Ionicons name="camera-outline" size={40} color={Colors.opticYellow} />
            </View>
            <Text style={styles.uploadTitle}>Screenshot Import</Text>
            <Text style={styles.uploadDesc}>
              Take a photo or select a screenshot from your match history
            </Text>

            <View style={styles.uploadButtons}>
              <Pressable style={styles.uploadBtn} onPress={() => pickImage('camera')}>
                <Ionicons name="camera" size={22} color={Colors.opticYellow} />
                <Text style={styles.uploadBtnText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.uploadBtn} onPress={() => pickImage('library')}>
                <Ionicons name="images" size={22} color={Colors.opticYellow} />
                <Text style={styles.uploadBtnText}>Photo Library</Text>
              </Pressable>
            </View>

            {/* Platform pre-selection */}
            <View style={styles.platformHint}>
              <Text style={styles.platformHintText}>
                {platformHint ? 'Selected platform:' : 'Optional — select platform for better accuracy:'}
              </Text>
              <View style={styles.platformChips}>
                {(['nettla', 'playtomic', 'padelmates', 'matchii'] as DetectedPlatform[]).map((p) => (
                  <Pressable
                    key={p}
                    style={[
                      styles.platformChip,
                      { borderColor: PLATFORM_COLORS[p] },
                      platformHint === p && { backgroundColor: PLATFORM_COLORS[p] + '20' },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPlatformHint(platformHint === p ? null : p);
                    }}
                  >
                    <Text
                      style={[
                        styles.platformChipText,
                        { color: PLATFORM_COLORS[p] },
                        platformHint === p && { fontFamily: Fonts.bodySemiBold },
                      ]}
                    >
                      {PLATFORM_LABELS[p]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Processing Overlay */}
        {processing && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.processingCard}>
            {screenshotUri && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: screenshotUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.previewOverlay}>
                  <ActivityIndicator size="large" color={Colors.opticYellow} />
                </View>
              </View>
            )}
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

        {/* Error / Retry State */}
        {!processing && !hasResults && ocrError && screenshotUri && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorCard}>
            <Ionicons name="warning-outline" size={32} color={Colors.error} />
            <Text style={styles.errorTitle}>Import Failed</Text>
            <Text style={styles.errorMessage}>{ocrError}</Text>
            <View style={styles.errorActions}>
              <Pressable style={styles.retryBtn} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setOcrError(null);
                // Re-fetch the base64 from the URI isn't possible, so reset fully
                resetImport();
              }}>
                <Ionicons name="camera-outline" size={18} color={Colors.opticYellow} />
                <Text style={styles.retryBtnText}>New Screenshot</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Results — Match Review Cards */}
        {hasResults && (
          <Animated.View entering={FadeIn.duration(400)}>
            {/* Screenshot + platform strip */}
            {screenshotUri && (
              <Pressable style={styles.resultPreview} onPress={resetImport}>
                <Image source={{ uri: screenshotUri }} style={styles.resultPreviewImage} resizeMode="cover" />
                <View style={styles.resultPreviewInfo}>
                  <View style={styles.resultPreviewBadge}>
                    <View style={[styles.platformDot, { backgroundColor: PLATFORM_COLORS[detectedPlatform] }]} />
                    <Text style={styles.resultPreviewPlatform}>{PLATFORM_LABELS[detectedPlatform]}</Text>
                  </View>
                  <Text style={styles.resultPreviewAction}>Tap to re-scan</Text>
                </View>
                <Ionicons name="refresh-outline" size={20} color={Colors.textDim} />
              </Pressable>
            )}

            {/* Summary bar */}
            <View style={styles.summaryBar}>
              <Text style={styles.summaryText}>
                <Text style={styles.summaryHighlight}>{selectedCount}</Text> of {totalCount} matches selected
              </Text>
            </View>

            {/* Match cards */}
            {reviewMatches.map((match, index) => (
              <Animated.View
                key={`match-${index}`}
                entering={SlideInRight.delay(index * 100).duration(300)}
                style={[styles.matchCard, !match.selected && styles.matchCardDeselected]}
              >
                {/* Match header */}
                <View style={styles.matchHeader}>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>Match {index + 1}</Text>
                  </View>
                  <View style={styles.matchHeaderRight}>
                    {/* Win/Loss badge */}
                    {match.user_team && (
                      <View style={[styles.resultBadge, match.won ? styles.resultBadgeWin : styles.resultBadgeLoss]}>
                        <Text style={[styles.resultBadgeText, match.won ? styles.resultBadgeTextWin : styles.resultBadgeTextLoss]}>
                          {match.won ? 'WIN' : 'LOSS'}
                        </Text>
                      </View>
                    )}
                    {/* Select toggle */}
                    <Pressable
                      style={[styles.selectToggle, match.selected && styles.selectToggleActive]}
                      onPress={() => toggleMatchSelection(index)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={match.selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={match.selected ? Colors.opticYellow : Colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Date + venue */}
                <View style={styles.matchMeta}>
                  {match.date && (
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textDim} />
                      <Text style={styles.metaText}>
                        {match.date}{match.time ? ` at ${match.time}` : ''}
                      </Text>
                    </View>
                  )}
                  {match.venue && (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={14} color={Colors.textDim} />
                      <Text style={styles.metaText}>{match.venue}</Text>
                    </View>
                  )}
                </View>

                {/* Teams + scores */}
                <View style={styles.scoreSection}>
                  {/* Team A */}
                  <View style={[styles.teamRow, match.user_team === 'a' && styles.teamRowUser]}>
                    <View style={styles.teamNames}>
                      {match.team_a.map((name, ni) => (
                        <Text
                          key={ni}
                          style={[styles.playerName, match.user_team === 'a' && styles.playerNameUser]}
                        >
                          {name}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.setScores}>
                      {match.sets.map((set, si) => (
                        <Pressable
                          key={si}
                          style={styles.scoreCell}
                          onPress={() => updateSetScore(index, si, 'team_a', 1)}
                          onLongPress={() => updateSetScore(index, si, 'team_a', -1)}
                        >
                          <Text style={[styles.scoreText, set.team_a > set.team_b && styles.scoreTextWin]}>
                            {set.team_a}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.scoreDivider} />

                  {/* Team B */}
                  <View style={[styles.teamRow, match.user_team === 'b' && styles.teamRowUser]}>
                    <View style={styles.teamNames}>
                      {match.team_b.map((name, ni) => (
                        <Text
                          key={ni}
                          style={[styles.playerName, match.user_team === 'b' && styles.playerNameUser]}
                        >
                          {name}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.setScores}>
                      {match.sets.map((set, si) => (
                        <Pressable
                          key={si}
                          style={styles.scoreCell}
                          onPress={() => updateSetScore(index, si, 'team_b', 1)}
                          onLongPress={() => updateSetScore(index, si, 'team_b', -1)}
                        >
                          <Text style={[styles.scoreText, set.team_b > set.team_a && styles.scoreTextWin]}>
                            {set.team_b}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Add/Remove Set Controls */}
                <View style={styles.setControls}>
                  {match.sets.length > 1 && (
                    <Pressable
                      style={styles.setControlBtn}
                      onPress={() => removeSet(index, match.sets.length - 1)}
                      hitSlop={8}
                    >
                      <Ionicons name="remove-circle-outline" size={18} color={Colors.error} />
                      <Text style={[styles.setControlText, { color: Colors.error }]}>Remove set</Text>
                    </Pressable>
                  )}
                  {match.sets.length < 5 && (
                    <Pressable
                      style={styles.setControlBtn}
                      onPress={() => addSet(index)}
                      hitSlop={8}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={Colors.aquaGreen} />
                      <Text style={[styles.setControlText, { color: Colors.aquaGreen }]}>Add set</Text>
                    </Pressable>
                  )}
                </View>

                {match.scoreEdited && (
                  <Text style={styles.editedHint}>Score edited</Text>
                )}

                {/* Game type toggle */}
                <View style={styles.matchTypeRow}>
                  <Text style={styles.matchTypeLabel}>
                    {match.matchType === 'competitive' ? 'Competitive' : 'Friendly'}
                  </Text>
                  <Pressable
                    style={[
                      styles.matchTypeToggle,
                      match.matchType === 'competitive' && styles.matchTypeToggleCompetitive,
                    ]}
                    onPress={() => toggleMatchType(index)}
                  >
                    <Ionicons
                      name={match.matchType === 'competitive' ? 'trophy' : 'happy-outline'}
                      size={16}
                      color={match.matchType === 'competitive' ? Colors.opticYellow : Colors.aquaGreen}
                    />
                    <Text
                      style={[
                        styles.matchTypeToggleText,
                        { color: match.matchType === 'competitive' ? Colors.opticYellow : Colors.aquaGreen },
                      ]}
                    >
                      {match.matchType === 'competitive' ? 'Ranked' : 'Social'}
                    </Text>
                  </Pressable>
                </View>

                {/* Match details — intensity, conditions, court side */}
                <View style={styles.detailChipsRow}>
                  <Pressable style={styles.detailChip} onPress={() => cycleIntensity(index)}>
                    <Ionicons
                      name="flame-outline"
                      size={14}
                      color={match.intensity ? Colors.opticYellow : Colors.textMuted}
                    />
                    <Text style={[styles.detailChipText, match.intensity && { color: Colors.textSecondary }]}>
                      {match.intensity
                        ? match.intensity.charAt(0).toUpperCase() + match.intensity.slice(1)
                        : 'Intensity'}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.detailChip} onPress={() => cycleConditions(index)}>
                    <Ionicons
                      name={match.conditions === 'outdoor' ? 'sunny-outline' : 'business-outline'}
                      size={14}
                      color={match.conditions ? Colors.aquaGreen : Colors.textMuted}
                    />
                    <Text style={[styles.detailChipText, match.conditions && { color: Colors.textSecondary }]}>
                      {match.conditions
                        ? match.conditions.charAt(0).toUpperCase() + match.conditions.slice(1)
                        : 'Conditions'}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.detailChip} onPress={() => cycleCourtSide(index)}>
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={14}
                      color={match.courtSide ? Colors.violet : Colors.textMuted}
                    />
                    <Text style={[styles.detailChipText, match.courtSide && { color: Colors.textSecondary }]}>
                      {match.courtSide
                        ? match.courtSide === 'both' ? 'Both Sides' : match.courtSide.charAt(0).toUpperCase() + match.courtSide.slice(1)
                        : 'Court Side'}
                    </Text>
                  </Pressable>
                </View>

                {/* Player Ratings */}
                <View style={styles.ratingsSection}>
                  <Text style={styles.ratingsSectionTitle}>
                    <Ionicons name="star-outline" size={14} color={Colors.opticYellow} />
                    {' '}Player Ratings
                  </Text>
                  {[...match.team_a, ...match.team_b].map((name) => (
                    <View key={name} style={styles.ratingRow}>
                      <Text style={styles.ratingPlayerName} numberOfLines={1}>{name}</Text>
                      <TextInput
                        style={styles.ratingInput}
                        value={match.editableRatings[name] ?? ''}
                        onChangeText={(v) => updatePlayerRating(index, name, v)}
                        placeholder="—"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                        maxLength={6}
                      />
                    </View>
                  ))}
                </View>
              </Animated.View>
            ))}

            {/* Tap hint */}
            <View style={styles.proTip}>
              <Ionicons name="bulb-outline" size={18} color={Colors.opticYellow} />
              <Text style={styles.proTipText}>
                Tap a score to increase it, long-press to decrease. Tap chips to set intensity, conditions, and court side.
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Floating CTA */}
      {hasResults && selectedCount > 0 && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.floatingCta}>
          <Button
            title={saving ? 'Saving...' : `Save ${selectedCount} Match${selectedCount !== 1 ? 'es' : ''} to Profile`}
            onPress={handleSave}
            variant="primary"
            size="lg"
            style={styles.ctaButton}
            disabled={saving}
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
    fontSize: 11,
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

  // Result Preview strip
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

  // Summary bar
  summaryBar: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[4],
  },
  summaryText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
  },
  summaryHighlight: {
    fontFamily: Fonts.bodyBold,
    color: Colors.opticYellow,
    fontSize: 16,
  },

  // Match card
  matchCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: Colors.opticYellow,
  },
  matchCardDeselected: {
    opacity: 0.4,
    borderLeftColor: Colors.textMuted,
  },

  // Match header
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  matchBadge: {
    backgroundColor: Alpha.yellow10,
    paddingHorizontal: Spacing[3],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  matchBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.opticYellow,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  resultBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  resultBadgeWin: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  resultBadgeLoss: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  resultBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  resultBadgeTextWin: {
    color: Colors.success,
  },
  resultBadgeTextLoss: {
    color: Colors.error,
  },
  selectToggle: {
    padding: 2,
  },
  selectToggleActive: {},

  // Match meta
  matchMeta: {
    gap: Spacing[1],
    marginBottom: Spacing[3],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
  },

  // Score section
  scoreSection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[3],
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[2],
  },
  teamRowUser: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.opticYellow,
    paddingLeft: Spacing[2],
    marginLeft: -Spacing[2],
  },
  teamNames: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  playerNameUser: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.opticYellow,
  },
  setScores: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  scoreCell: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scoreTextWin: {
    color: Colors.textPrimary,
  },
  scoreDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  setControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing[4],
    marginBottom: Spacing[2],
  },
  setControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[1],
    paddingHorizontal: Spacing[2],
  },
  setControlText: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  editedHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.warning,
    textAlign: 'right',
    marginBottom: Spacing[2],
  },

  // Match type toggle
  matchTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTypeLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
  },
  matchTypeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.aquaGreen,
    backgroundColor: Alpha.aqua08,
  },
  matchTypeToggleCompetitive: {
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow08,
  },
  matchTypeToggleText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
  },

  // Detail chips (intensity, conditions, court side)
  detailChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surface,
  },
  detailChipText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Ratings
  ratingsSection: {
    marginTop: Spacing[3],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    gap: Spacing[2],
  },
  ratingsSectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing[1],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  ratingPlayerName: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  ratingInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    width: 70,
    textAlign: 'center',
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.opticYellow,
  },

  // Error / Retry
  errorCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[6],
    alignItems: 'center',
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    gap: Spacing[3],
  },
  errorTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  errorMessage: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
  retryBtn: {
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
  retryBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },

  // Pro tip
  proTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    backgroundColor: Alpha.yellow05,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Alpha.yellow10,
    marginTop: Spacing[2],
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
