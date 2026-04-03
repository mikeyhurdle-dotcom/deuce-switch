import { useCallback, useMemo, useRef, useState } from 'react';
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
import Animated, { FadeIn, FadeInUp, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../src/providers/AuthProvider';
import { useTournament } from '../../../../src/hooks/useTournament';
import { Alpha, Colors, Fonts, Spacing, Radius } from '../../../../src/lib/constants';
import { AnimatedPressable, useSpringPress } from '../../../../src/hooks/useSpringPress';
import {
  PlayerShareCard,
  type CardStyle,
  type PlayerShareCardBadge,
} from '../../../../src/components/PlayerShareCard';

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
  { key: 'stories', label: 'Stories', icon: 'camera', bg: '#C13584', color: '#FFFFFF' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', bg: '#25D366', color: '#FFFFFF' },
  { key: 'twitter', label: 'Twitter', icon: 'logo-twitter', bg: '#1DA1F2', color: '#FFFFFF' },
  { key: 'copy', label: 'Copy Link', icon: 'link', bg: Colors.surface, color: Colors.textSecondary },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', bg: '#E1306C', color: '#FFFFFF' },
  { key: 'save', label: 'Save Image', icon: 'download-outline', bg: Colors.surface, color: Colors.textSecondary },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal', bg: Colors.surface, color: Colors.textSecondary },
  { key: 'feed', label: 'My Feed', icon: 'newspaper-outline', bg: Alpha.yellow12, color: Colors.opticYellow },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getBadges(rank: number, winRate: number, matchesWon: number): PlayerShareCardBadge[] {
  const badges: PlayerShareCardBadge[] = [];
  if (rank === 1) badges.push({ emoji: '🏆', label: 'Champion', variant: 'gold' });
  if (rank <= 3) badges.push({ emoji: '🥇', label: `Top ${rank}`, variant: 'gold' });
  if (winRate >= 0.75) badges.push({ emoji: '🔥', label: 'On Fire', variant: 'green' });
  if (matchesWon >= 5) badges.push({ emoji: '⚡', label: 'Win Streak', variant: 'aqua' });
  return badges.slice(0, 3);
}

// ── Share Target Button ──────────────────────────────────────────────────────

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
      testID={`btn-share-${target.key}`}
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

// ── Main Screen ─────────────────────────────────────────────────────────────
// "The most important step a man can take is the next one."

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { tournament, standings } = useTournament(id ?? null);
  const cardRef = useRef<ViewShot | null>(null);
  const [cardStyle, setCardStyle] = useState<CardStyle>('dark');

  // Compute user's standing
  const myStanding = useMemo(() => {
    if (!user?.id || standings.length === 0) return null;
    const idx = standings.findIndex((s) => s.playerId === user.id);
    if (idx === -1) return null;
    return { ...standings[idx], rank: idx + 1 };
  }, [user?.id, standings]);

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

  // ── Share actions ───────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await captureCard();
    if (!uri) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Sharing', 'Sharing is not available on this device.');
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share My Results' });
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
    const link = `https://playsmashd.com/t/${id}`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Copied!', 'Tournament link copied to clipboard.');
  }, [id]);

  const handleTargetPress = useCallback(
    (key: string) => {
      switch (key) {
        case 'save':
          handleSaveImage();
          break;
        case 'copy':
          handleCopyLink();
          break;
        case 'more':
        case 'stories':
        case 'whatsapp':
        case 'twitter':
        case 'instagram':
        case 'feed':
          handleShare();
          break;
      }
    },
    [handleShare, handleSaveImage, handleCopyLink],
  );

  // ── Guard: no data yet ──────────────────────────────────────────────────
  if (!tournament || !myStanding) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading your results…</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const badges = getBadges(myStanding.rank, myStanding.winRate, myStanding.wins);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView testID="screen-tournament-share" style={styles.safe}>
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
          <Text style={styles.headerTitle}>Share Result</Text>
          <Pressable
            testID="btn-save-image"
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
              <PlayerShareCard
                playerName={myStanding.displayName}
                rank={myStanding.rank}
                totalPlayers={standings.length}
                totalPoints={myStanding.pointsFor}
                matchesPlayed={myStanding.matchesPlayed}
                matchesWon={myStanding.wins}
                winRate={myStanding.winRate}
                tournamentName={tournament.name}
                tournamentFormat={tournament.tournament_format}
                tournamentDate={tournament.created_at}
                badges={badges}
                cardStyle={cardStyle}
              />
            </ViewShot>
          </Animated.View>

          {/* ─── Card Style Selector ───────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(100).duration(250)}>
            <Text style={styles.sectionLabel}>CARD STYLE</Text>
            <View style={styles.styleRow}>
              {CARD_STYLES.map((s) => (
                <Pressable
                  key={s.key}
                  testID={`btn-card-style-${s.key}`}
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

          {/* ─── Feed CTA ──────────────────────────────────────────── */}
          <Animated.View entering={FadeInUp.delay(300).duration(250)}>
            <Pressable
              testID="btn-feed-cta"
              style={styles.feedCta}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleShare();
              }}
            >
              <Ionicons name="newspaper-outline" size={18} color={Colors.darkBg} />
              <Text style={styles.feedCtaText}>Add to My Feed</Text>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
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

  // Feed CTA
  feedCta: {
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
  feedCtaText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.darkBg,
  },
});
