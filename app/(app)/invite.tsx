/**
 * Invite Screen — shareable h2h stats card for inviting padel partners.
 *
 * Receives opponentId + opponentName via search params, fetches h2h record,
 * renders an H2HShareCard inside ViewShot, and provides share targets.
 *
 * "The most important step a man can take is the next one."
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/providers/AuthProvider';
import { Alpha, AppConfig, Colors, Fonts, Spacing, Radius } from '../../src/lib/constants';
import { AnimatedPressable, useSpringPress } from '../../src/hooks/useSpringPress';
import { H2HShareCard } from '../../src/components/H2HShareCard';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { getHeadToHead, type HeadToHeadRecord } from '../../src/services/stats-service';
import type { CardStyle } from '../../src/components/PlayerShareCard';

// ── Types ──────────────────────────────────────────────────────────────────
type IconName = keyof typeof Ionicons.glyphMap;

type ShareTarget = {
  key: string;
  label: string;
  icon: IconName;
  bg: string;
  color: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const CARD_STYLES: { key: CardStyle; label: string; preview: string }[] = [
  { key: 'dark', label: 'Dark', preview: '#130E24' },
  { key: 'neon', label: 'Neon', preview: '#141E00' },
  { key: 'violet', label: 'Violet', preview: '#1F0D3A' },
  { key: 'light', label: 'Light', preview: '#EEEAF5' },
];

const SHARE_TARGETS: ShareTarget[] = [
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', bg: '#25D366', color: '#FFFFFF' },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', bg: '#E1306C', color: '#FFFFFF' },
  { key: 'save', label: 'Save Image', icon: 'download-outline', bg: Colors.surface, color: Colors.textSecondary },
  { key: 'copy', label: 'Copy Link', icon: 'link', bg: Colors.surface, color: Colors.textSecondary },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal', bg: Colors.surface, color: Colors.textSecondary },
];

// ── Share Target Button ────────────────────────────────────────────────────

function ShareTargetButton({
  target,
  onPress,
}: {
  target: ShareTarget;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();
  return (
    <AnimatedPressable
      testID={`btn-invite-share-${target.key}`}
      style={[styles.shareItem, animatedStyle]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
    >
      <View style={[styles.shareIcon, { backgroundColor: target.bg }]}>
        <Ionicons name={target.icon} size={22} color={target.color} />
      </View>
      <Text style={styles.shareLabel}>{target.label}</Text>
    </AnimatedPressable>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function InviteScreen() {
  const { opponentId, opponentName } = useLocalSearchParams<{
    opponentId: string;
    opponentName: string;
  }>();
  const { user, profile } = useAuth();
  const cardRef = useRef<ViewShot | null>(null);
  const [cardStyle, setCardStyle] = useState<CardStyle>('dark');
  const [h2h, setH2h] = useState<HeadToHeadRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch h2h ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !opponentId) return;
    let cancelled = false;
    (async () => {
      try {
        const record = await getHeadToHead(user.id, opponentId);
        if (!cancelled) setH2h(record);
      } catch {
        // Non-critical — show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, opponentId]);

  // ── Share text ─────────────────────────────────────────────────────────
  const shareText = h2h
    ? `We've played ${h2h.matchesPlayed} matches on Smashd! Check out our head to head. Download: ${AppConfig.website}`
    : `Join me on Smashd! Download: ${AppConfig.website}`;

  // ── Capture helper ──────────────────────────────────────────────────────
  const captureCard = useCallback(async (): Promise<string | null> => {
    try {
      if (!cardRef.current?.capture) return null;
      return await cardRef.current.capture();
    } catch {
      Alert.alert('Error', 'Could not capture card. Please try again.');
      return null;
    }
  }, []);

  // ── Share actions ─────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await captureCard();
    if (!uri) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Sharing', 'Sharing is not available on this device.');
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Invite to Smashd' });
  }, [captureCard]);

  const handleSaveImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await captureCard();
    if (!uri) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Sharing', 'Sharing is not available on this device.');
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Save Image' });
  }, [captureCard]);

  const handleCopyLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(AppConfig.website);
    Alert.alert('Copied!', 'Download link copied to clipboard.');
  }, []);

  const handleTargetPress = useCallback(
    (key: string) => {
      switch (key) {
        case 'save':
          handleSaveImage();
          break;
        case 'copy':
          handleCopyLink();
          break;
        default:
          handleShare();
          break;
      }
    },
    [handleShare, handleSaveImage, handleCopyLink],
  );

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.loadingHeader}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Invite</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.loadingBody}>
            <Skeleton width={390} height={480} borderRadius={12} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  const playerName = profile?.display_name ?? 'You';
  const playerAvatar = profile?.game_face_url ?? null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView testID="screen-invite" style={styles.safe}>
        {/* ─── Header ────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Invite</Text>
          <Pressable
            testID="btn-invite-save"
            style={styles.saveButton}
            onPress={handleSaveImage}
            hitSlop={8}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Card Preview ──────────────────────────────────────── */}
          <Animated.View key={cardStyle} entering={FadeIn.duration(250)} style={styles.cardPreview}>
            <ViewShot
              ref={cardRef}
              options={{ format: 'png', quality: 1 }}
            >
              <H2HShareCard
                playerName={playerName}
                playerAvatar={playerAvatar}
                opponentName={h2h?.opponentName ?? opponentName ?? 'Player'}
                opponentAvatar={h2h?.opponentAvatar ?? null}
                wins={h2h?.wins ?? 0}
                losses={h2h?.losses ?? 0}
                matchesPlayed={h2h?.matchesPlayed ?? 0}
                pointsFor={h2h?.pointsFor ?? 0}
                pointsAgainst={h2h?.pointsAgainst ?? 0}
                cardStyle={cardStyle}
              />
            </ViewShot>
          </Animated.View>

          {/* ─── Share Text Preview ────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(50).duration(250)}>
            <View style={styles.shareTextBox}>
              <Ionicons name="chatbubble-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.shareTextPreview} numberOfLines={2}>
                {shareText}
              </Text>
            </View>
          </Animated.View>

          {/* ─── Card Style Selector ───────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(100).duration(250)}>
            <Text style={styles.sectionLabel}>CARD STYLE</Text>
            <View style={styles.styleRow}>
              {CARD_STYLES.map((s) => (
                <Pressable
                  key={s.key}
                  testID={`btn-invite-style-${s.key}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCardStyle(s.key);
                  }}
                  style={[
                    styles.styleOption,
                    { backgroundColor: s.preview },
                    s.key === cardStyle && styles.styleOptionActive,
                  ]}
                >
                  {s.key === cardStyle && (
                    <Ionicons name="checkmark" size={18} color={Colors.opticYellow} />
                  )}
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* ─── Share Targets ──────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(200).duration(250)}>
            <Text style={styles.sectionLabel}>SHARE TO</Text>
            <View style={styles.shareGrid}>
              {SHARE_TARGETS.map((t) => (
                <ShareTargetButton
                  key={t.key}
                  target={t}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleTargetPress(t.key);
                  }}
                />
              ))}
            </View>
          </Animated.View>

          {/* ─── Send Invite CTA ───────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(300).duration(250)}>
            <Pressable
              testID="btn-invite-send"
              style={styles.sendCta}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleShare();
              }}
            >
              <Ionicons name="paper-plane-outline" size={18} color={Colors.darkBg} />
              <Text style={styles.sendCtaText}>Send Invite</Text>
            </Pressable>
          </Animated.View>
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

  // Loading
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  loadingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Alpha.yellow12,
  },
  saveButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.opticYellow,
  },

  // Scroll
  scrollContent: {
    paddingBottom: Spacing[10],
  },

  // Card Preview
  cardPreview: {
    alignItems: 'center',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[5],
  },

  // Share text
  shareTextBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[2],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
  },
  shareTextPreview: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 18,
  },

  // Style Selector
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
    letterSpacing: 0.5,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[3],
  },
  styleRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing[5],
  },
  styleOption: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleOptionActive: {
    borderColor: Colors.opticYellow,
  },

  // Share Grid
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: Spacing[5],
  },
  shareItem: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  shareIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Send CTA
  sendCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing[5],
    marginTop: Spacing[5],
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.opticYellow,
  },
  sendCtaText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.darkBg,
  },
});
