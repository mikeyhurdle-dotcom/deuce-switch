import { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadows, Alpha } from '../../../src/lib/constants';
import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase';
import type { Profile, MatchSource } from '../../../src/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────

type DetectedPlatform = 'playtomic' | 'padelmates' | 'nettla' | 'matchii' | 'unknown';

type SetScore = { team_a: number; team_b: number };

type ReviewPlayer = {
  name: string;
  matchedProfile: Profile | null;
  rating: number | null;
  isUser: boolean;
};

type CourtSide = 'right' | 'left' | null;
type Venue = 'indoor' | 'outdoor';
type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'windy' | 'hot' | 'cold';
type IntensityLevel = 1 | 2 | 3 | 4 | 5;

type MatchData = {
  platform: DetectedPlatform;
  confidence: number;
  date: string | null;
  time: string | null;
  venue: string | null;
  sets: SetScore[];
  teamA: ReviewPlayer[];
  teamB: ReviewPlayer[];
};

// ── Constants ──────────────────────────────────────────────────────────────

const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };

const PLATFORM_LABELS: Record<DetectedPlatform, string> = {
  playtomic: 'Playtomic',
  padelmates: 'Padel Mates',
  nettla: 'Nettla',
  matchii: 'Matchii',
  unknown: 'Screenshot',
};

const INTENSITY_DATA: Record<IntensityLevel, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😎', label: 'Easy win', color: Colors.success },
  2: { emoji: '👍', label: 'Comfortable', color: Colors.aquaGreen },
  3: { emoji: '⚡', label: 'Competitive', color: Colors.opticYellow },
  4: { emoji: '💪', label: 'Tough', color: Colors.warning },
  5: { emoji: '🔥', label: 'Battle', color: Colors.error },
};

const WEATHER_OPTIONS: { id: WeatherCondition; label: string; icon: string }[] = [
  { id: 'sunny', label: 'Sunny', icon: 'sunny' },
  { id: 'cloudy', label: 'Cloudy', icon: 'cloudy' },
  { id: 'rain', label: 'Rain', icon: 'rainy' },
  { id: 'windy', label: 'Windy', icon: 'flag' },
  { id: 'hot', label: 'Hot', icon: 'thermometer' },
  { id: 'cold', label: 'Cold', icon: 'snow' },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function ImportReviewScreen() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ matchData?: string }>();

  // Parse incoming match data from OCR
  const initialData = useMemo<MatchData | null>(() => {
    if (params.matchData) {
      try {
        return JSON.parse(params.matchData);
      } catch {
        // fallback
      }
    }
    // No data provided — show upload prompt
    return null;
  }, [params.matchData, profile]);

  // ── Upload & OCR state ──────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handlePickAndProcess = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUploadError(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    setUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ocr-extract-players', {
        body: {
          image_base64: result.assets[0].base64,
          context: 'match_import',
        },
      });

      if (error) throw error;

      if (!data?.match) {
        setUploadError('Could not extract match data from this screenshot. Try a clearer image.');
        return;
      }

      // Map OCR result to MatchData and navigate to review
      const matchData: MatchData = {
        platform: data.platform ?? 'unknown',
        confidence: data.confidence ?? 0.5,
        date: data.match.date ?? null,
        time: data.match.time ?? null,
        venue: data.match.venue ?? null,
        sets: (data.match.sets ?? []).map((s: { team_a: number; team_b: number }) => ({
          team_a: s.team_a,
          team_b: s.team_b,
        })),
        teamA: (data.match.team_a ?? []).map((name: string) => ({
          name,
          matchedProfile: null,
          rating: data.match.ratings?.[name] ?? null,
          isUser: false,
        })),
        teamB: (data.match.team_b ?? []).map((name: string) => ({
          name,
          matchedProfile: null,
          rating: data.match.ratings?.[name] ?? null,
          isUser: false,
        })),
      };

      // Re-navigate to this same screen with the parsed data
      router.replace({
        pathname: '/(app)/tournament/import-review',
        params: { matchData: JSON.stringify(matchData) },
      });
    } catch (err) {
      console.error('Match import OCR failed:', err);
      setUploadError('Failed to process screenshot. Please try again.');
    } finally {
      setUploading(false);
    }
  }, []);

  // ── No data: show upload prompt ─────────────────────────────────────
  if (!initialData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.darkBg }} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Import Match',
            headerStyle: { backgroundColor: Colors.darkBg },
            headerTintColor: Colors.textPrimary,
            headerTitleStyle: { fontFamily: Fonts.bodySemiBold },
          }}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing[6], gap: Spacing[4] }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Alpha.yellow08, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera-outline" size={36} color={Colors.opticYellow} />
          </View>
          <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 20, color: Colors.textPrimary, textAlign: 'center' }}>
            Import Match Results
          </Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: 15, color: Colors.textDim, textAlign: 'center', lineHeight: 22 }}>
            Upload a screenshot from Playtomic, Padel Mates, Nettla, or Matchii. We'll extract the scores, players, and venue automatically.
          </Text>
          {uploadError ? (
            <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: Colors.error, textAlign: 'center' }}>
              {uploadError}
            </Text>
          ) : null}
          <Pressable
            style={{
              flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
              backgroundColor: uploading ? Alpha.yellow05 : Alpha.yellow10,
              borderWidth: 1, borderColor: Alpha.yellow30,
              borderRadius: Radius.md, paddingHorizontal: Spacing[5], paddingVertical: Spacing[3], marginTop: Spacing[2],
            }}
            onPress={handlePickAndProcess}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color={Colors.opticYellow} />
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 15, color: Colors.opticYellow }}>
                  Processing...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="images" size={20} color={Colors.opticYellow} />
                <Text style={{ fontFamily: Fonts.bodySemiBold, fontSize: 15, color: Colors.opticYellow }}>
                  Choose Screenshot
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Editable state ─────────────────────────────────────────────────────

  const [sets, setSets] = useState<SetScore[]>(initialData.sets);
  const [originalSets] = useState<SetScore[]>(initialData.sets);
  const [date, setDate] = useState(initialData.date ?? '');
  const [time, setTime] = useState(initialData.time ?? '');
  const [venue, setVenue] = useState(initialData.venue ?? '');
  const [teamA] = useState(initialData.teamA);
  const [teamB] = useState(initialData.teamB);
  const [intensity, setIntensity] = useState<IntensityLevel>(4);
  const [courtSide, setCourtSide] = useState<CourtSide>(null);
  const [venueType, setVenueType] = useState<Venue>('outdoor');
  const [weather, setWeather] = useState<Set<WeatherCondition>>(new Set(['cloudy']));
  const [saving, setSaving] = useState(false);

  // ── Derived state ──────────────────────────────────────────────────────

  const scoreEdited = useMemo(() => {
    return sets.some(
      (s, i) => s.team_a !== originalSets[i]?.team_a || s.team_b !== originalSets[i]?.team_b
    );
  }, [sets, originalSets]);

  const matchResult = useMemo(() => {
    let wins = 0;
    let losses = 0;
    sets.forEach((s) => {
      if (s.team_a > s.team_b) wins++;
      else if (s.team_b > s.team_a) losses++;
    });
    if (wins > losses) return 'WIN';
    if (losses > wins) return 'LOSS';
    return 'DRAW';
  }, [sets]);

  const avgOpponentRating = useMemo(() => {
    const ratings = teamB.filter((p) => p.rating != null).map((p) => p.rating!);
    if (ratings.length === 0) return null;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }, [teamB]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleScoreTap = useCallback(
    (setIndex: number, team: 'team_a' | 'team_b') => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSets((prev) =>
        prev.map((s, i) => {
          if (i !== setIndex) return s;
          const current = s[team];
          return { ...s, [team]: current >= 7 ? 0 : current + 1 };
        })
      );
    },
    []
  );

  const handleIntensityChange = useCallback((level: IntensityLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIntensity(level);
  }, []);

  const handleCourtSide = useCallback((side: CourtSide) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCourtSide(side);
  }, []);

  const handleVenueType = useCallback((type: Venue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVenueType(type);
  }, []);

  const toggleWeather = useCallback((condition: WeatherCondition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeather((prev) => {
      const next = new Set(prev);
      if (next.has(condition)) next.delete(condition);
      else next.add(condition);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!profile) {
      Alert.alert('Not signed in', 'Please sign in to save match results.');
      return;
    }

    setSaving(true);
    try {
      const totalTeamA = sets.reduce((sum, s) => sum + s.team_a, 0);
      const totalTeamB = sets.reduce((sum, s) => sum + s.team_b, 0);
      const won = matchResult === 'WIN';

      const { error } = await supabase.from('player_match_results').insert({
        player_id: profile.id,
        team_score: totalTeamA,
        opponent_score: totalTeamB,
        won,
        source: 'screenshot' as MatchSource,
        played_at: date ? `${date}T${time || '00:00'}:00` : new Date().toISOString(),
        partner_name: teamA.find((p) => !p.isUser)?.name ?? null,
        opponent1_name: teamB[0]?.name ?? null,
        opponent2_name: teamB[1]?.name ?? null,
        partner_id: teamA.find((p) => !p.isUser)?.matchedProfile?.id ?? null,
        opponent1_id: teamB[0]?.matchedProfile?.id ?? null,
        opponent2_id: teamB[1]?.matchedProfile?.id ?? null,
      });

      if (error) throw error;

      Alert.alert('Match saved', 'Added to your match history.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('Save match error:', err);
      Alert.alert('Save failed', 'Could not save match. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [profile, sets, date, time, matchResult, teamA, teamB]);

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderSectionLabel = (title: string, hint?: string) => (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {hint && <Text style={styles.sectionHint}>{hint}</Text>}
    </View>
  );

  const renderScoreEditor = () => (
    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
      {renderSectionLabel('MATCH SCORE', 'tap to adjust')}

      <View style={styles.scoreGrid}>
        {/* Set labels row */}
        <View style={styles.scoreLabelsCol}>
          <View style={styles.scoreCorner} />
          <View style={styles.scoreLabelCell}>
            <Text style={styles.scoreLabelUs}>YOU</Text>
          </View>
          <View style={styles.scoreLabelCell}>
            <Text style={styles.scoreLabelThem}>THEM</Text>
          </View>
        </View>

        {sets.map((set, index) => (
          <View key={index} style={styles.scoreSetCol}>
            <Text style={styles.setLabel}>SET {index + 1}</Text>
            <Pressable
              onPress={() => handleScoreTap(index, 'team_a')}
              style={[styles.scoreCell, styles.scoreCellUs]}
            >
              <Text style={styles.scoreCellTextUs}>{set.team_a}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleScoreTap(index, 'team_b')}
              style={[styles.scoreCell, styles.scoreCellThem]}
            >
              <Text style={styles.scoreCellTextThem}>{set.team_b}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {scoreEdited && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.scoreWarning}>
          <Ionicons name="warning" size={14} color={Colors.warning} />
          <Text style={styles.scoreWarningText}>Editing score flags this result</Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderEditedFlag = () => {
    if (!scoreEdited) return null;
    return (
      <Animated.View entering={SlideInRight.duration(400)} style={styles.editedFlag}>
        <Ionicons name="pencil" size={14} color={Colors.warning} />
        <Text style={styles.editedFlagText}>Result Edited</Text>
        <Text style={styles.editedFlagSub}>Visible on your profile</Text>
      </Animated.View>
    );
  };

  const renderFieldCard = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: string,
    onPress?: () => void
  ) => (
    <Pressable style={styles.fieldCard} onPress={onPress}>
      <Ionicons name={icon} size={16} color={Colors.textDim} style={styles.fieldIcon} />
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value || 'Not detected'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  );

  const renderPlayerRow = (player: ReviewPlayer, teamLabel: string) => {
    const isMatched = player.isUser || player.matchedProfile != null;
    return (
      <Pressable key={player.name} style={styles.playerRow}>
        <View style={[styles.playerAvatar, isMatched ? styles.avatarMatched : styles.avatarNew]}>
          {isMatched ? (
            <Text style={styles.avatarInitial}>
              {player.name.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Ionicons name="help" size={16} color={Colors.textMuted} />
          )}
        </View>
        <View style={styles.playerInfo}>
          <View style={styles.playerNameRow}>
            <Text style={styles.playerName}>{player.name}</Text>
            <View
              style={[styles.playerBadge, isMatched ? styles.badgeMatched : styles.badgeNew]}
            >
              <Text
                style={[
                  styles.playerBadgeText,
                  isMatched ? styles.badgeMatchedText : styles.badgeNewText,
                ]}
              >
                {player.isUser ? 'YOU' : isMatched ? 'MATCHED' : 'NEW'}
              </Text>
            </View>
          </View>
          <Text style={styles.playerDetail}>
            {player.isUser
              ? 'Auto-detected from your account'
              : isMatched
              ? `Linked profile • Level ${player.rating ?? '—'}`
              : 'Not found on Smashd — tap to search'}
          </Text>
        </View>
        {player.rating != null && (
          <View style={styles.ratingPill}>
            <Text style={styles.ratingPillText}>{player.rating.toFixed(2)}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </Pressable>
    );
  };

  const renderOpponentRatings = () => {
    const ratingsExist = teamB.some((p) => p.rating != null);
    if (!ratingsExist) return null;

    return (
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.card}>
        {renderSectionLabel('OPPONENT RATINGS', 'extracted from screenshot')}
        <View style={styles.ratingChipsRow}>
          {teamB.map((p) => (
            <View key={p.name} style={styles.ratingChip}>
              <Text style={styles.ratingChipName}>
                {p.name.split(' ')[0]} {p.name.split(' ')[1]?.charAt(0) ?? ''}
              </Text>
              <Text style={styles.ratingChipValue}>{p.rating?.toFixed(2) ?? '?'}</Text>
            </View>
          ))}
          {avgOpponentRating != null && (
            <View style={[styles.ratingChip, styles.ratingChipAvg]}>
              <Text style={styles.ratingChipName}>Avg</Text>
              <Text style={[styles.ratingChipValue, styles.ratingChipAvgValue]}>
                {avgOpponentRating.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.ratingNote}>
          Ratings pulled from {PLATFORM_LABELS[initialData.platform]}. If a platform doesn't
          show ratings, this section won't appear.
        </Text>
      </Animated.View>
    );
  };

  const renderIntensity = () => {
    const data = INTENSITY_DATA[intensity];
    return (
      <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.card}>
        {renderSectionLabel('MATCH INTENSITY', 'how hard was this game?')}
        <View style={styles.intensityRow}>
          {([1, 2, 3, 4, 5] as IntensityLevel[]).map((level) => {
            const active = level === intensity;
            const levelData = INTENSITY_DATA[level];
            return (
              <Pressable
                key={level}
                onPress={() => handleIntensityChange(level)}
                style={[styles.intensityDot, active && { backgroundColor: levelData.color }]}
              >
                <Text style={[styles.intensityDotText, active && styles.intensityDotActive]}>
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.intensityLabels}>
          <Text style={styles.intensityLabelMin}>Easy win</Text>
          <Text style={styles.intensityLabelMid}>Competitive</Text>
          <Text style={styles.intensityLabelMax}>Battle</Text>
        </View>
        <View style={styles.intensityResult}>
          <Text style={styles.intensityEmoji}>{data.emoji}</Text>
          <Text style={[styles.intensityLabel, { color: data.color }]}>{data.label}</Text>
        </View>
      </Animated.View>
    );
  };

  const renderCourtSide = () => (
    <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.card}>
      {renderSectionLabel('YOUR COURT SIDE')}
      <View style={styles.courtSideRow}>
        <Pressable
          style={[styles.courtSideBtn, courtSide === 'right' && styles.courtSideBtnActive]}
          onPress={() => handleCourtSide('right')}
        >
          <Ionicons
            name="arrow-forward"
            size={18}
            color={courtSide === 'right' ? Colors.opticYellow : Colors.textDim}
          />
          <Text
            style={[
              styles.courtSideBtnText,
              courtSide === 'right' && styles.courtSideBtnTextActive,
            ]}
          >
            Right (Drive)
          </Text>
        </Pressable>
        <Pressable
          style={[styles.courtSideBtn, courtSide === 'left' && styles.courtSideBtnActive]}
          onPress={() => handleCourtSide('left')}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={courtSide === 'left' ? Colors.opticYellow : Colors.textDim}
          />
          <Text
            style={[
              styles.courtSideBtnText,
              courtSide === 'left' && styles.courtSideBtnTextActive,
            ]}
          >
            Left (Reves)
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={() => handleCourtSide(null)}>
        <Text style={styles.courtSideTertiary}>Not sure / switched sides</Text>
      </Pressable>
    </Animated.View>
  );

  const renderConditions = () => (
    <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.card}>
      {renderSectionLabel('CONDITIONS', 'optional')}
      <View style={styles.conditionsRow}>
        <Pressable
          style={[styles.conditionChip, venueType === 'indoor' && styles.conditionChipActive]}
          onPress={() => handleVenueType('indoor')}
        >
          <Ionicons
            name="business"
            size={14}
            color={venueType === 'indoor' ? Colors.aquaGreen : Colors.textDim}
          />
          <Text
            style={[
              styles.conditionChipText,
              venueType === 'indoor' && styles.conditionChipTextActive,
            ]}
          >
            Indoor
          </Text>
        </Pressable>
        <Pressable
          style={[styles.conditionChip, venueType === 'outdoor' && styles.conditionChipActive]}
          onPress={() => handleVenueType('outdoor')}
        >
          <Ionicons
            name="partly-sunny"
            size={14}
            color={venueType === 'outdoor' ? Colors.aquaGreen : Colors.textDim}
          />
          <Text
            style={[
              styles.conditionChipText,
              venueType === 'outdoor' && styles.conditionChipTextActive,
            ]}
          >
            Outdoor
          </Text>
        </Pressable>
      </View>

      {venueType === 'outdoor' && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.weatherRow}>
          {WEATHER_OPTIONS.map((w) => {
            const active = weather.has(w.id);
            return (
              <Pressable
                key={w.id}
                style={[styles.weatherChip, active && styles.weatherChipActive]}
                onPress={() => toggleWeather(w.id)}
              >
                <Ionicons
                  name={w.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={active ? Colors.aquaGreen : Colors.textDim}
                />
                <Text
                  style={[
                    styles.weatherChipText,
                    active && styles.weatherChipTextActive,
                  ]}
                >
                  {w.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderPreviewCard = () => {
    const resultColor =
      matchResult === 'WIN'
        ? Colors.success
        : matchResult === 'LOSS'
        ? Colors.error
        : Colors.textDim;

    return (
      <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.previewCard}>
        <Text style={styles.previewTitle}>MATCH PREVIEW</Text>

        <View style={styles.previewHeader}>
          <Text style={[styles.previewResult, { color: resultColor }]}>{matchResult}</Text>
          <View style={styles.previewBadges}>
            <View style={styles.previewBadgeImported}>
              <Text style={styles.previewBadgeImportedText}>IMPORTED</Text>
            </View>
            {scoreEdited && (
              <View style={styles.previewBadgeEdited}>
                <Text style={styles.previewBadgeEditedText}>RESULT EDITED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Set scores */}
        <View style={styles.previewScores}>
          {sets.map((s, i) => {
            const won = s.team_a > s.team_b;
            const lost = s.team_b > s.team_a;
            return (
              <View
                key={i}
                style={[
                  styles.previewScorePill,
                  won && styles.previewScoreWon,
                  lost && styles.previewScoreLost,
                ]}
              >
                <Text
                  style={[
                    styles.previewScoreText,
                    won && styles.previewScoreWonText,
                    lost && styles.previewScoreLostText,
                  ]}
                >
                  {s.team_a}-{s.team_b}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.previewOpponent}>
          vs {teamB.map((p) => p.name).join(' & ')}
        </Text>

        {/* Meta chips */}
        <View style={styles.previewMeta}>
          {venue ? <MetaChip icon="location" text={venue} /> : null}
          <MetaChip icon="camera" text={PLATFORM_LABELS[initialData.platform]} />
          {courtSide && (
            <MetaChip
              icon={courtSide === 'right' ? 'arrow-forward' : 'arrow-back'}
              text={courtSide === 'right' ? 'Drive' : 'Reves'}
            />
          )}
          {venueType === 'outdoor' && weather.size > 0 && (
            <MetaChip
              icon="cloudy"
              text={Array.from(weather)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(', ')}
            />
          )}
          {avgOpponentRating != null && (
            <MetaChip icon="star" text={`Opp. avg ${avgOpponentRating.toFixed(2)}`} />
          )}
          <MetaChip
            icon="flame"
            text={INTENSITY_DATA[intensity].label}
          />
        </View>
      </Animated.View>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Review Match</Text>
          <Text style={styles.headerSubtitle}>Check the details and save to your profile</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Source Banner */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.sourceBanner}>
          <View style={styles.sourceIcon}>
            <Ionicons name="camera" size={20} color={Colors.opticYellow} />
          </View>
          <View style={styles.sourceInfo}>
            <Text style={styles.sourceTitle}>
              {PLATFORM_LABELS[initialData.platform]} Screenshot
            </Text>
            <Text style={styles.sourceDetail}>Uploaded just now • 1 match detected</Text>
          </View>
          <View style={styles.parsedBadge}>
            <Ionicons name="checkmark" size={12} color={Colors.success} />
            <Text style={styles.parsedBadgeText}>PARSED</Text>
          </View>
        </Animated.View>

        {/* OCR Confidence */}
        <Animated.View entering={FadeInDown.delay(75).duration(400)} style={styles.confidenceBar}>
          <View style={styles.confidenceDot} />
          <Text style={styles.confidenceText}>
            High confidence extraction ({Math.round(initialData.confidence * 100)}%)
          </Text>
          <Text style={styles.confidenceHint}>Tap any field to edit</Text>
        </Animated.View>

        {/* Score Editor */}
        {renderScoreEditor()}

        {/* Result Edited Flag */}
        {renderEditedFlag()}

        {/* Date & Venue */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
          {renderSectionLabel('DATE & VENUE')}
          {renderFieldCard('calendar', 'DATE', date ? formatDate(date) : '')}
          {renderFieldCard('time', 'TIME', time)}
          {renderFieldCard('location', 'VENUE', venue)}
        </Animated.View>

        {/* Players */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.card}>
          {renderSectionLabel('PLAYERS', 'tap to change or search')}
          <Text style={styles.teamLabel}>YOUR TEAM</Text>
          {teamA.map((p) => renderPlayerRow(p, 'YOUR TEAM'))}
          <View style={styles.teamDivider} />
          <Text style={[styles.teamLabel, styles.teamLabelOpponent]}>OPPONENTS</Text>
          {teamB.map((p) => renderPlayerRow(p, 'OPPONENTS'))}
        </Animated.View>

        {/* Opponent Ratings */}
        {renderOpponentRatings()}

        {/* Intensity */}
        {renderIntensity()}

        {/* Court Side */}
        {renderCourtSide()}

        {/* Conditions */}
        {renderConditions()}

        {/* Preview Card */}
        {renderPreviewCard()}

        {/* Bottom padding for save button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Save Button */}
      <Animated.View entering={FadeIn.delay(600).duration(400)} style={styles.saveContainer}>
        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : 'Save to Profile'}
          </Text>
        </Pressable>
        <Text style={[styles.saveSub, scoreEdited && styles.saveSubEdited]}>
          {scoreEdited
            ? 'Score was edited — this will be flagged on your profile'
            : 'This match will be added to your history and stats'}
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── MetaChip sub-component ────────────────────────────────────────────────

function MetaChip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={10} color={Colors.textDim} />
      <Text style={styles.metaChipText}>{text}</Text>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  headerTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    marginTop: 2,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing[4],
    gap: Spacing[3],
  },

  // Source Banner
  sourceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    gap: Spacing[3],
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceInfo: { flex: 1 },
  sourceTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  sourceDetail: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 2,
  },
  parsedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  parsedBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.success,
    letterSpacing: 0.5,
  },

  // Confidence Bar
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  confidenceText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.success,
    flex: 1,
  },
  confidenceHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
  },

  // Card container
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },

  // Section Labels
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  sectionHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Score Editor
  scoreGrid: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  scoreLabelsCol: {
    gap: Spacing[1],
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  scoreCorner: { height: 18 },
  scoreLabelCell: {
    height: 38,
    justifyContent: 'center',
  },
  scoreLabelUs: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.opticYellow,
    letterSpacing: 0.5,
  },
  scoreLabelThem: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  scoreSetCol: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing[1],
  },
  setLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    height: 18,
    lineHeight: 18,
  },
  scoreCell: {
    width: '100%',
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCellUs: {
    backgroundColor: Alpha.yellow10,
    borderWidth: 1,
    borderColor: Alpha.yellow20,
  },
  scoreCellThem: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreCellTextUs: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.opticYellow,
  },
  scoreCellTextThem: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textSecondary,
  },
  scoreWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[3],
    gap: Spacing[2],
  },
  scoreWarningText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.warning,
  },

  // Edited Flag
  editedFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  editedFlagText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.warning,
    flex: 1,
  },
  editedFlagSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Field Cards
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[2],
  },
  fieldIcon: {
    marginRight: Spacing[3],
  },
  fieldContent: { flex: 1 },
  fieldLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  fieldValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  // Players
  teamLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.opticYellow,
    letterSpacing: 0.8,
    marginBottom: Spacing[2],
  },
  teamLabelOpponent: {
    color: Colors.textDim,
  },
  teamDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[3],
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    gap: Spacing[3],
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMatched: {
    backgroundColor: Alpha.yellow15,
    borderWidth: 2,
    borderColor: Colors.opticYellow,
  },
  avatarNew: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    borderStyle: 'dashed',
  },
  avatarInitial: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },
  playerInfo: { flex: 1 },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  playerName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  playerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeMatched: {
    backgroundColor: Alpha.yellow12,
  },
  badgeNew: {
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  playerBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  badgeMatchedText: {
    color: Colors.opticYellow,
  },
  badgeNewText: {
    color: Colors.warning,
  },
  playerDetail: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 2,
  },
  ratingPill: {
    backgroundColor: Alpha.yellow10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  ratingPillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.opticYellow,
  },

  // Opponent Ratings
  ratingChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  ratingChipAvg: {
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  ratingChipName: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textDim,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ratingChipValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.opticYellow,
    backgroundColor: Alpha.yellow10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ratingChipAvgValue: {
    color: Colors.warning,
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  ratingNote: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },

  // Intensity
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  intensityDot: {
    flex: 1,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  intensityDotText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textDim,
  },
  intensityDotActive: {
    color: Colors.darkBg,
  },
  intensityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  intensityLabelMin: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textMuted,
  },
  intensityLabelMid: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textMuted,
  },
  intensityLabelMax: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.textMuted,
  },
  intensityResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  intensityEmoji: {
    fontSize: 20,
  },
  intensityLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
  },

  // Court Side
  courtSideRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[2],
  },
  courtSideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  courtSideBtnActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow08,
  },
  courtSideBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
  },
  courtSideBtnTextActive: {
    color: Colors.opticYellow,
  },
  courtSideTertiary: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // Conditions
  conditionsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  conditionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2],
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  conditionChipActive: {
    borderColor: Colors.aquaGreen,
    backgroundColor: Alpha.aqua08,
  },
  conditionChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
  },
  conditionChipTextActive: {
    color: Colors.aquaGreen,
  },
  weatherRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  weatherChipActive: {
    borderColor: Colors.aquaGreen,
    backgroundColor: Alpha.aqua08,
  },
  weatherChipText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
  },
  weatherChipTextActive: {
    color: Colors.aquaGreen,
  },

  // Preview Card
  previewCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  previewTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing[3],
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  previewResult: {
    fontFamily: Fonts.bodyBold,
    fontSize: 24,
  },
  previewBadges: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  previewBadgeImported: {
    backgroundColor: Alpha.violet15,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  previewBadgeImportedText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 8,
    color: Colors.violet,
    letterSpacing: 0.5,
  },
  previewBadgeEdited: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  previewBadgeEditedText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 8,
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  previewScores: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  previewScorePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  previewScoreWon: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  previewScoreLost: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  previewScoreText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.textDim,
  },
  previewScoreWonText: {
    color: Colors.success,
  },
  previewScoreLostText: {
    color: Colors.error,
  },
  previewOpponent: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing[3],
  },
  previewMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[1],
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  metaChipText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textDim,
  },

  // Save Button
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.darkBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Platform.OS === 'ios' ? Spacing[8] : Spacing[4],
  },
  saveBtn: {
    backgroundColor: Colors.opticYellow,
    borderRadius: Radius.md,
    paddingVertical: Spacing[4],
    alignItems: 'center',
    ...Shadows.glowYellow,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.darkBg,
    letterSpacing: 0.3,
  },
  saveSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
    textAlign: 'center',
    marginTop: Spacing[2],
  },
  saveSubEdited: {
    color: Colors.warning,
  },
});
