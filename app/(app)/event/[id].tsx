import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useState, useCallback, useMemo } from 'react';
import { Alpha, Colors, Fonts, Spacing, Radius, Shadows } from '../../../src/lib/constants';
import { AnimatedPressable, useSpringPress } from '../../../src/hooks/useSpringPress';

// ─── Types ───────────────────────────────────────────────────────────────────

type FormatTag = 'americano' | 'mexicano' | 'mixicano' | 'team_americano';
type LevelTag = 'beginner' | 'intermediate' | 'advanced' | 'all';

interface Attendee {
  id: string;
  name: string;
  avatarUrl: string;
}

interface PastResult {
  id: string;
  title: string;
  date: string;
  playerCount: number;
  roundCount: number;
  winners: {
    medal: 'gold' | 'silver' | 'bronze';
    name: string;
    avatarUrl: string;
  }[];
}

interface EventDetail {
  id: string;
  name: string;
  organiser: { name: string; verified: boolean };
  date: string;
  time: string;
  duration: string;
  venue: string;
  address: string;
  format: FormatTag;
  formatDescription: string;
  level: LevelTag;
  courts: number;
  courtType: string;
  price: number;
  spotsLeft: number;
  totalSpots: number;
  featured: boolean;
  description: string;
  attendees: Attendee[];
  pastResults: PastResult[];
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_EVENT: EventDetail = {
  id: '1',
  name: 'Thursday Night Smashd',
  organiser: { name: 'Padel Zone Dublin', verified: true },
  date: 'Thursday, Mar 13, 2026',
  time: '7:00 PM — 9:30 PM (2.5 hrs)',
  duration: '2.5 hrs',
  venue: 'Padel Zone Dublin',
  address: 'Sandyford Industrial Estate, Dublin 18',
  format: 'americano',
  formatDescription: '7 rounds · Random partners · 12 players max',
  level: 'all',
  courts: 3,
  courtType: 'Premium surface · LED lighting',
  price: 15,
  spotsLeft: 4,
  totalSpots: 12,
  featured: true,
  description:
    'The best weekly Americano in Dublin! All levels welcome. Matches are tracked live on Smashd with automatic leaderboard and results saved to your profile. Prizes for the top 3. Water and snacks included. Changing rooms available on site.',
  attendees: [
    { id: '1', name: 'Sarah R', avatarUrl: 'https://i.pravatar.cc/96?img=5' },
    { id: '2', name: 'James P', avatarUrl: 'https://i.pravatar.cc/96?img=8' },
    { id: '3', name: 'Dan K', avatarUrl: 'https://i.pravatar.cc/96?img=11' },
    { id: '4', name: 'Lucia M', avatarUrl: 'https://i.pravatar.cc/96?img=9' },
    { id: '5', name: 'Tom W', avatarUrl: 'https://i.pravatar.cc/96?img=7' },
    { id: '6', name: 'Ana F', avatarUrl: 'https://i.pravatar.cc/96?img=23' },
    { id: '7', name: 'Ravi H', avatarUrl: 'https://i.pravatar.cc/96?img=12' },
    { id: '8', name: 'Emma O', avatarUrl: 'https://i.pravatar.cc/96?img=32' },
  ],
  pastResults: [
    {
      id: 'pr1',
      title: 'Thursday Night Smashd — Mar 6',
      date: 'Mar 6',
      playerCount: 12,
      roundCount: 7,
      winners: [
        { medal: 'gold', name: 'James P', avatarUrl: 'https://i.pravatar.cc/44?img=8' },
        { medal: 'silver', name: 'Mikey G', avatarUrl: 'https://i.pravatar.cc/44?img=12' },
        { medal: 'bronze', name: 'Sarah R', avatarUrl: 'https://i.pravatar.cc/44?img=5' },
      ],
    },
    {
      id: 'pr2',
      title: 'Thursday Night Smashd — Feb 27',
      date: 'Feb 27',
      playerCount: 10,
      roundCount: 6,
      winners: [
        { medal: 'gold', name: 'Dan K', avatarUrl: 'https://i.pravatar.cc/44?img=11' },
        { medal: 'silver', name: 'Tom W', avatarUrl: 'https://i.pravatar.cc/44?img=7' },
        { medal: 'bronze', name: 'Lucia M', avatarUrl: 'https://i.pravatar.cc/44?img=9' },
      ],
    },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<FormatTag, string> = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  mixicano: 'Mixicano',
  team_americano: 'Team Americano',
};

const LEVEL_LABELS: Record<LevelTag, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all: 'All Levels',
};

const MEDAL_ICONS: Record<string, { icon: string; color: string }> = {
  gold: { icon: 'trophy', color: Colors.gold },
  silver: { icon: 'trophy-outline', color: '#C0C0C0' },
  bronze: { icon: 'trophy-outline', color: '#CD7F32' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}14` }]}>
      {icon && <Ionicons name={icon} size={10} color={color} style={styles.badgeIcon} />}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function DetailRow({
  icon,
  iconColor,
  label,
  sublabel,
  action,
  onAction,
  isLast,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  label: string;
  sublabel: string;
  action?: string;
  onAction?: () => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      <View style={[styles.detailIconWrap, { backgroundColor: `${iconColor}14` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailSublabel}>{sublabel}</Text>
      </View>
      {action && onAction && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAction();
          }}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.detailAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function AttendeeAvatar({ attendee }: { attendee: Attendee }) {
  return (
    <View style={styles.attendeeItem}>
      <Image source={{ uri: attendee.avatarUrl }} style={styles.attendeeAvatar} />
      <Text style={styles.attendeeName} numberOfLines={1}>
        {attendee.name}
      </Text>
    </View>
  );
}

function MoreBubble({ count }: { count: number }) {
  return (
    <View style={styles.attendeeItem}>
      <View style={styles.moreBubble}>
        <Text style={styles.moreBubbleText}>+{count}</Text>
      </View>
      <Text style={styles.attendeeName}>more</Text>
    </View>
  );
}

function PastResultCard({ result }: { result: PastResult }) {
  return (
    <View style={styles.pastCard}>
      <Text style={styles.pastTitle}>{result.title}</Text>
      <Text style={styles.pastMeta}>
        {result.playerCount} players · {result.roundCount} rounds
      </Text>
      <View style={styles.winnersRow}>
        {result.winners.map((w) => {
          const medalInfo = MEDAL_ICONS[w.medal];
          return (
            <View key={w.name} style={styles.winnerItem}>
              <Ionicons
                name={medalInfo.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={14}
                color={medalInfo.color}
              />
              <Image source={{ uri: w.avatarUrl }} style={styles.winnerAvatar} />
              <Text style={styles.winnerName}>{w.name}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [saved, setSaved] = useState(false);
  const registerPress = useSpringPress();
  const sharePress = useSpringPress();

  // In production, fetch event by id from Supabase
  const event = MOCK_EVENT;

  const registeredCount = event.totalSpots - event.spotsLeft;
  const moreCount = Math.max(0, event.totalSpots - event.attendees.length);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaved((prev) => !prev);
  }, []);

  const handleRegister = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In production: deep-link to Playtomic or open registration flow
  }, []);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In production: open native share sheet
  }, []);

  const handleAddToCal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In production: add to device calendar
  }, []);

  const handleDirections = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const q = encodeURIComponent(event.address);
    const url = Platform.OS === 'ios'
      ? `maps:?q=${q}`
      : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${q}`);
    });
  }, [event.address]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero ──────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['#1A0F30', Colors.darkBg, '#0F1A25']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Ionicons name="football-outline" size={64} color={Colors.textMuted} style={styles.heroIcon} />
          <LinearGradient
            colors={['transparent', Colors.darkBg]}
            style={styles.heroFade}
          />

          {/* Back button */}
          <Pressable style={styles.heroBtn} onPress={handleBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
          </Pressable>

          {/* Bookmark button */}
          <Pressable
            style={[styles.heroBtn, styles.heroBtnRight]}
            onPress={handleBookmark}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove bookmark' : 'Bookmark event'}
            accessibilityState={{ selected: saved }}
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={saved ? Colors.opticYellow : Colors.textPrimary}
            />
          </Pressable>
        </View>

        {/* ─── Event Info ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.infoSection}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            <Badge
              label={FORMAT_LABELS[event.format]}
              color={Colors.opticYellow}
              icon="flash"
            />
            <Badge
              label={LEVEL_LABELS[event.level]}
              color={Colors.violet}
              icon="people"
            />
            {event.spotsLeft > 0 && (
              <Badge
                label={`${event.spotsLeft} spots left`}
                color={Colors.success}
                icon="checkmark-circle"
              />
            )}
            {event.featured && (
              <Badge label="Featured" color={Colors.gold} icon="star" />
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{event.name}</Text>

          {/* Organiser */}
          <View style={styles.organiserRow}>
            <Text style={styles.organiserLabel}>Organised by </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Navigate to organiser profile
              }}
            >
              <Text style={styles.organiserName}>{event.organiser.name}</Text>
            </Pressable>
            {event.organiser.verified && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={Colors.opticYellow}
                style={styles.verifiedIcon}
              />
            )}
          </View>
        </Animated.View>

        {/* ─── Detail Grid ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.detailGrid}>
          <DetailRow
            icon="calendar-outline"
            iconColor={Colors.opticYellow}
            label={event.date}
            sublabel={event.time}
            action="Add to Cal"
            onAction={handleAddToCal}
          />
          <DetailRow
            icon="location-outline"
            iconColor={Colors.error}
            label={event.venue}
            sublabel={event.address}
            action="Directions"
            onAction={handleDirections}
          />
          <DetailRow
            icon="tennisball-outline"
            iconColor={Colors.aquaGreen}
            label={`${FORMAT_LABELS[event.format]} Format`}
            sublabel={event.formatDescription}
          />
          <DetailRow
            icon="grid-outline"
            iconColor={Colors.violet}
            label={`${event.courts} Indoor Courts`}
            sublabel={event.courtType}
          />
          <DetailRow
            icon="cash-outline"
            iconColor={Colors.success}
            label={`€${event.price} per player`}
            sublabel="Paid via Playtomic at booking"
            isLast
          />
        </Animated.View>

        {/* ─── About ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <Text style={styles.sectionLabel}>About This Event</Text>
          <Text style={styles.aboutText}>{event.description}</Text>
        </Animated.View>

        {/* ─── Who's Going ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Who's Going</Text>
            <Text style={styles.attendeeCount}>
              {registeredCount} / {event.totalSpots} registered
            </Text>
          </View>

          <FlatList
            data={event.attendees}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AttendeeAvatar attendee={item} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attendeeList}
            ListFooterComponent={
              moreCount > 0 ? <MoreBubble count={moreCount} /> : null
            }
          />
        </Animated.View>

        {/* ─── Past Results ──────────────────────────────────────────── */}
        {event.pastResults.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>Past Results</Text>
            {event.pastResults.map((result) => (
              <PastResultCard key={result.id} result={result} />
            ))}
          </Animated.View>
        )}

        {/* Spacer for sticky CTA */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ─── Sticky CTA Bar ──────────────────────────────────────────── */}
      <LinearGradient
        colors={['transparent', Colors.darkBg]}
        locations={[0, 0.35]}
        style={styles.ctaGradient}
      >
        <SafeAreaView edges={['bottom']} style={styles.ctaInner}>
          <View style={styles.ctaRow}>
            {/* Share button */}
            <AnimatedPressable
              style={[styles.shareBtn, sharePress.animatedStyle]}
              onPressIn={sharePress.onPressIn}
              onPressOut={sharePress.onPressOut}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share event"
            >
              <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
            </AnimatedPressable>

            {/* Register button */}
            <AnimatedPressable
              style={[styles.registerBtn, registerPress.animatedStyle]}
              onPressIn={registerPress.onPressIn}
              onPressOut={registerPress.onPressOut}
              onPress={handleRegister}
              accessibilityRole="button"
              accessibilityLabel={`Register for ${event.name}, €${event.price}`}
            >
              <Text style={styles.registerText}>
                Register — €{event.price}
              </Text>
              <Ionicons name="open-outline" size={16} color={Colors.darkBg} />
            </AnimatedPressable>
          </View>

          <Text style={styles.ctaSublabel}>
            {event.spotsLeft} spots remaining · Books via Playtomic
          </Text>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // Hero
  hero: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroIcon: {
    opacity: 0.15,
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  heroBtn: {
    position: 'absolute',
    top: 56,
    left: Spacing[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Alpha.black50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBtnRight: {
    left: undefined,
    right: Spacing[4],
  },

  // Info
  infoSection: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.sm,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  organiserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[2],
  },
  organiserLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
  },
  organiserName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.opticYellow,
  },
  verifiedIcon: {
    marginLeft: 4,
  },

  // Detail Grid
  detailGrid: {
    marginHorizontal: Spacing[5],
    marginTop: Spacing[5],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing[4],
    gap: 14,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  detailSublabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    marginTop: 1,
  },
  detailAction: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.opticYellow,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing[5],
    marginTop: Spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing[2],
  },
  attendeeCount: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.opticYellow,
    marginBottom: Spacing[2],
  },

  // About
  aboutText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 21,
  },

  // Attendees
  attendeeList: {
    paddingVertical: Spacing[1],
    gap: Spacing[3],
  },
  attendeeItem: {
    alignItems: 'center',
    gap: 4,
  },
  attendeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
  },
  attendeeName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
    maxWidth: 56,
    textAlign: 'center',
  },
  moreBubble: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBubbleText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.textDim,
  },

  // Past Results
  pastCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    marginBottom: Spacing[2],
  },
  pastTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  pastMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    marginTop: 4,
  },
  winnersRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  winnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  winnerAvatar: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
  },
  winnerName: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Bottom spacer
  bottomSpacer: {
    height: 140,
  },

  // CTA Bar
  ctaGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing[4],
  },
  ctaInner: {
    paddingHorizontal: Spacing[5],
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  shareBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.opticYellow,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[2],
    ...Shadows.glowYellow,
  },
  registerText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.darkBg,
  },
  ctaSublabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
    marginTop: Spacing[2],
    marginBottom: Spacing[2],
  },
});
