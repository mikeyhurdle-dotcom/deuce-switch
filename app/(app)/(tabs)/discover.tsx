import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius, Shadows, Alpha } from '../../../src/lib/constants';
import { getAlertSubscriptions, toggleEventAlert } from '../../../src/services/alert-service';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable, useSpringPress } from '../../../src/hooks/useSpringPress';
import { supabase } from '../../../src/lib/supabase';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';
import { useAuth } from '../../../src/providers/AuthProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveTab = 'play' | 'compete';

type DateFilterKey = 'all' | 'this_week' | 'this_weekend' | 'next_week';

type PlayEventFormat = 'americano' | 'mexicano' | 'mixicano' | 'team_americano' | 'tournament' | 'open_play';
type PlayEventLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
type PlayEventStatus = 'upcoming' | 'full';

interface PlayEventRow {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  format: PlayEventFormat;
  level: PlayEventLevel;
  price_cents: number | null;
  currency: string | null;
  max_players: number | null;
  spots_available: number | null;
  registration_url: string | null;
  source_platform: string | null;
  status: PlayEventStatus;
  // Flattened from the view — no joins needed
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  organiser_name: string | null;
  organiser_type: string | null;
}

type CompetitionCategory = 'tournament' | 'league' | 'british_tour';
type CompetitionFormat = 'pairs' | 'team' | 'individual';
type CompetitionGrade = 'grade_1' | 'grade_2' | 'grade_3' | 'grade_4' | 'grade_5' | 'open';
type CompetitionStatus = 'upcoming' | 'in_progress' | 'full';

interface CompetitionRow {
  id: string;
  name: string;
  category: CompetitionCategory;
  format: CompetitionFormat;
  grade: CompetitionGrade | null;
  level: string | null;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  city: string | null;
  postcode: string | null;
  organiser_name: string | null;
  registration_url: string | null;
  price_cents: number | null;
  currency: string | null;
  status: CompetitionStatus;
  max_teams: number | null;
  spots_available: number | null;
  season: string | null;
  league_name: string | null;
  tour_stop_number: number | null;
  prize_money_cents: number | null;
  featured: boolean | null;
}

interface NormalisedEvent {
  id: string;
  name: string;
  venueName: string;
  city: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  format: string;
  level: string | null;
  priceCents: number | null;
  currency: string | null;
  spotsAvailable: number | null;
  status: string;
  registrationUrl: string | null;
  organiserName: string | null;
  // Compete-specific
  category: CompetitionCategory | null;
  grade: string | null;
  prizeMoneyRaw: number | null;
  featured: boolean;
  maxCapacity: number | null;
}

interface DateGroup {
  dateLabel: string;
  dateIcon: React.ComponentProps<typeof Ionicons>['name'];
  events: NormalisedEvent[];
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
};

function formatPrice(cents: number | null, currency: string | null): string {
  if (cents === null || cents === 0) return 'Free';
  const symbol = CURRENCY_SYMBOLS[(currency ?? 'GBP').toUpperCase()] ?? (currency ?? '');
  const amount = Math.floor(cents / 100);
  const remainder = cents % 100;
  if (remainder === 0) return `${symbol}${amount}`;
  return `${symbol}${amount}.${String(remainder).padStart(2, '0')}`;
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getStatusBadge(
  status: string,
  spots: number | null,
): { label: string; color: string; bg: string } | null {
  if (status === 'full') {
    return { label: 'FULLY BOOKED', color: Colors.error, bg: Alpha.error12 };
  }
  if (status === 'in_progress') {
    return { label: 'IN PROGRESS', color: Colors.aquaGreen, bg: Alpha.aqua12 };
  }
  if (spots !== null && spots > 0 && spots <= 4) {
    return {
      label: `${spots} SPOT${spots === 1 ? '' : 'S'} LEFT`,
      color: Colors.warning,
      bg: Alpha.warning12,
    };
  }
  return null;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDateOnly(dateStr: string): Date {
  // event_date is YYYY-MM-DD — parse without timezone offset
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateStr: string): { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] } {
  const d = parseDateOnly(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const dayName = DAY_NAMES[d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()];
  const dayNum = d.getDate();

  if (diffDays === 0) return { label: `Today — ${dayName} ${dayNum} ${monthName}`, icon: 'today-outline' };
  if (diffDays === 1) return { label: `Tomorrow — ${dayName} ${dayNum} ${monthName}`, icon: 'calendar-outline' };
  return { label: `${dayName} — ${dayNum} ${monthName}`, icon: 'calendar-outline' };
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return '';
  // start_time is HH:MM:SS or HH:MM
  const formatT = (t: string) => {
    const parts = t.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ?? '00';
    const suffix = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return m === '00' ? `${h12}${suffix}` : `${h12}:${m}${suffix}`;
  };
  const s = formatT(start);
  if (!end) return s;
  const e = formatT(end);
  return `${s} – ${e}`;
}

function getStartOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return result;
}

function matchesDateFilter(dateStr: string, filter: DateFilterKey): boolean {
  if (filter === 'all') return true;
  const eventDate = parseDateOnly(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === 'this_week') {
    const weekStart = getStartOfWeek(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return eventDate >= weekStart && eventDate <= weekEnd;
  }
  if (filter === 'this_weekend') {
    const weekStart = getStartOfWeek(today);
    const saturday = new Date(weekStart);
    saturday.setDate(saturday.getDate() + 5);
    const sunday = new Date(weekStart);
    sunday.setDate(sunday.getDate() + 6);
    return (
      eventDate.getTime() === saturday.getTime() ||
      eventDate.getTime() === sunday.getTime()
    );
  }
  if (filter === 'next_week') {
    const weekStart = getStartOfWeek(today);
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    return eventDate >= nextWeekStart && eventDate <= nextWeekEnd;
  }
  return true;
}

// ─── Normalise helpers ───────────────────────────────────────────────────────

function normalisePlayEvent(row: PlayEventRow): NormalisedEvent {
  return {
    id: row.id,
    name: row.name,
    venueName: row.venue_name ?? 'Unknown Venue',
    city: row.city ?? '',
    eventDate: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    format: row.format,
    level: row.level,
    priceCents: row.price_cents,
    currency: row.currency,
    spotsAvailable: row.spots_available,
    status: row.status,
    registrationUrl: row.registration_url,
    organiserName: row.organiser_name ?? null,
    category: null,
    grade: null,
    prizeMoneyRaw: null,
    featured: false,
    maxCapacity: row.max_players,
  };
}

function normaliseCompetition(row: CompetitionRow): NormalisedEvent {
  return {
    id: row.id,
    name: row.name,
    venueName: row.venue_name ?? 'TBC',
    city: row.city ?? '',
    eventDate: row.event_date,
    startTime: row.start_time ?? null,
    endTime: row.end_time ?? null,
    format: row.format,
    level: row.level,
    priceCents: row.price_cents,
    currency: row.currency,
    spotsAvailable: row.spots_available,
    status: row.status,
    registrationUrl: row.registration_url,
    organiserName: row.organiser_name,
    category: row.category,
    grade: row.grade,
    prizeMoneyRaw: row.prize_money_cents,
    featured: row.featured ?? false,
    maxCapacity: row.max_teams,
  };
}

function groupByDate(events: NormalisedEvent[]): DateGroup[] {
  const groups = new Map<string, NormalisedEvent[]>();
  for (const event of events) {
    const key = event.eventDate;
    const existing = groups.get(key);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(key, [event]);
    }
  }
  const result: DateGroup[] = [];
  for (const [key, items] of groups) {
    const { label, icon } = formatDateLabel(key);
    result.push({ dateLabel: label, dateIcon: icon, events: items });
  }
  return result.sort((a, b) => {
    const aDate = a.events[0]?.eventDate ?? '';
    const bDate = b.events[0]?.eventDate ?? '';
    return aDate.localeCompare(bDate);
  });
}

// ─── Badge colour helpers ────────────────────────────────────────────────────

function formatBadgeColor(format: string): string {
  switch (format) {
    case 'americano': return Colors.opticYellow;
    case 'mexicano': return Colors.violet;
    case 'mixicano': return Colors.violet;
    case 'team_americano': return Colors.aquaGreen;
    case 'tournament': return Colors.coral;
    case 'open_play': return Colors.textDim;
    case 'pairs': return Colors.opticYellow;
    case 'team': return Colors.aquaGreen;
    case 'individual': return Colors.violetLight;
    default: return Colors.textDim;
  }
}

function formatBadgeBg(format: string): string {
  switch (format) {
    case 'americano': return Alpha.yellow10;
    case 'mexicano': return Alpha.violet10;
    case 'mixicano': return Alpha.violet10;
    case 'team_americano': return Alpha.aqua10;
    case 'tournament': return Alpha.pink10;
    case 'open_play': return Alpha.slate08;
    case 'pairs': return Alpha.yellow10;
    case 'team': return Alpha.aqua10;
    case 'individual': return Alpha.purpleLight10;
    default: return Alpha.slate08;
  }
}

function levelBadgeColor(level: string | null): string {
  switch (level) {
    case 'beginner': return Colors.success;
    case 'intermediate': return Colors.aquaGreen;
    case 'advanced': return Colors.warning;
    case 'all_levels': return Colors.textDim;
    default: return Colors.textDim;
  }
}

function levelBadgeBg(level: string | null): string {
  switch (level) {
    case 'beginner': return Alpha.success10;
    case 'intermediate': return Alpha.aqua10;
    case 'advanced': return Alpha.warning10;
    case 'all_levels': return Alpha.slate08;
    default: return Alpha.slate08;
  }
}

function categoryBadgeColor(category: CompetitionCategory): string {
  switch (category) {
    case 'tournament': return Colors.coral;
    case 'league': return Colors.aquaGreen;
    case 'british_tour': return Colors.opticYellow;
  }
}

function categoryBadgeBg(category: CompetitionCategory): string {
  switch (category) {
    case 'tournament': return Alpha.pink10;
    case 'league': return Alpha.aqua10;
    case 'british_tour': return Alpha.yellow10;
  }
}

function gradeBadgeColor(grade: string): string {
  switch (grade) {
    case 'grade_1': return Colors.gold;
    case 'grade_2': return Colors.silver;
    case 'grade_3': return Colors.bronze;
    default: return Colors.textDim;
  }
}

function gradeBadgeBg(grade: string): string {
  switch (grade) {
    case 'grade_1': return Alpha.gold10;
    case 'grade_2': return Alpha.silver10;
    case 'grade_3': return Alpha.bronze10;
    default: return Alpha.slate08;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const DATE_FILTER_CHIPS: { key: DateFilterKey; label: string; testID: string }[] = [
  { key: 'all', label: 'All Dates', testID: 'filter-all-dates' },
  { key: 'this_week', label: 'This Week', testID: 'filter-this-week' },
  { key: 'this_weekend', label: 'This Weekend', testID: 'filter-this-weekend' },
  { key: 'next_week', label: 'Next Week', testID: 'filter-next-week' },
];

function TabButton({
  label,
  active,
  onPress,
  testID,
  tintColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
  tintColor?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tabButton, active && styles.tabButtonActive, active && tintColor ? { backgroundColor: tintColor } : undefined]}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();
  return (
    <AnimatedPressable
      testID={testID}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.filterChip, active && styles.filterChipActive, animatedStyle]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function DateHeader({
  icon,
  label,
  count,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  count: number;
}) {
  return (
    <View style={styles.dateHeader}>
      <View style={styles.dateHeaderLeft}>
        <Ionicons name={icon} size={16} color={Colors.textDim} />
        <Text style={styles.dateHeaderLabel}>{label}</Text>
      </View>
      <View style={styles.dateCountBadge}>
        <Text style={styles.dateCountText}>
          {count} event{count !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

function EventCard({
  event,
  isCompete,
  onPress,
  alertActive,
  onToggleAlert,
}: {
  event: NormalisedEvent;
  isCompete: boolean;
  onPress: () => void;
  alertActive?: boolean;
  onToggleAlert?: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();
  const statusBadge = getStatusBadge(event.status, event.spotsAvailable);
  const timeStr = formatTimeRange(event.startTime, event.endTime);
  const priceStr = formatPrice(event.priceCents, event.currency);

  return (
    <AnimatedPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${event.name} at ${event.venueName}, ${timeStr}`}
      style={[
        styles.eventCard,
        event.featured && styles.eventCardFeatured,
        animatedStyle,
      ]}
    >
      {/* Featured badge */}
      {event.featured && (
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={10} color={Colors.darkBg} />
          <Text style={styles.featuredBadgeText}>FEATURED</Text>
        </View>
      )}

      {/* Top section: name + venue + time */}
      <View style={styles.eventTopSection}>
        <View style={styles.eventNameRow}>
          <Text style={styles.eventName} numberOfLines={2}>
            {event.name}
          </Text>
          {statusBadge && (
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                {statusBadge.label}
              </Text>
            </View>
          )}
        </View>

        {/* Venue + city */}
        <View style={styles.venueRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textDim} />
          <Text style={styles.venueName} numberOfLines={1}>
            {event.venueName}
            {event.city ? `, ${event.city}` : ''}
          </Text>
        </View>

        {/* Time */}
        {timeStr.length > 0 && (
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color={Colors.textDim} />
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
        )}

        {/* Organiser */}
        {event.organiserName && (
          <View style={styles.organiserRow}>
            <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.organiserText}>{event.organiserName}</Text>
          </View>
        )}
      </View>

      {/* Tags row */}
      <View style={styles.tagsRow}>
        {/* Format badge */}
        <View style={[styles.tag, { backgroundColor: formatBadgeBg(event.format) }]}>
          <Text style={[styles.tagText, { color: formatBadgeColor(event.format) }]}>
            {formatLabel(event.format)}
          </Text>
        </View>

        {/* Level badge */}
        {event.level && (
          <View style={[styles.tag, { backgroundColor: levelBadgeBg(event.level) }]}>
            <Text style={[styles.tagText, { color: levelBadgeColor(event.level) }]}>
              {formatLabel(event.level)}
            </Text>
          </View>
        )}

        {/* Compete-specific badges */}
        {isCompete && event.category && (
          <View style={[styles.tag, { backgroundColor: categoryBadgeBg(event.category) }]}>
            <Text style={[styles.tagText, { color: categoryBadgeColor(event.category) }]}>
              {formatLabel(event.category)}
            </Text>
          </View>
        )}

        {isCompete && event.grade && (
          <View style={[styles.tag, { backgroundColor: gradeBadgeBg(event.grade) }]}>
            <Text style={[styles.tagText, { color: gradeBadgeColor(event.grade) }]}>
              {formatLabel(event.grade)}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom meta row */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Text style={styles.priceText}>{priceStr}</Text>

          {event.spotsAvailable !== null && event.status !== 'full' && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.spotsText}>
                {event.spotsAvailable} {isCompete ? 'teams' : 'spots'} left
              </Text>
            </>
          )}

          {isCompete && event.prizeMoneyRaw !== null && event.prizeMoneyRaw > 0 && (
            <>
              <View style={styles.metaDot} />
              <Ionicons name="trophy-outline" size={12} color={Colors.gold} />
              <Text style={styles.prizeMoney}>
                {formatPrice(event.prizeMoneyRaw, event.currency)}
              </Text>
            </>
          )}
        </View>

        <View style={styles.metaRight}>
          {event.status === 'full' ? (
            <Pressable
              testID={`btn-notify-${event.id}`}
              style={[styles.notifyBtn, alertActive && styles.notifyBtnActive]}
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onToggleAlert?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={alertActive ? 'Cancel spot alert' : 'Notify me when spots open'}
            >
              <Ionicons
                name={alertActive ? 'notifications' : 'notifications-outline'}
                size={14}
                color={alertActive ? Colors.darkBg : Colors.textMuted}
              />
              <Text style={[styles.notifyBtnText, alertActive && styles.notifyBtnTextActive]}>
                {alertActive ? 'Notifying' : 'Notify Me'}
              </Text>
            </Pressable>
          ) : event.registrationUrl ? (
            <Pressable
              style={styles.registerBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                WebBrowser.openBrowserAsync(event.registrationUrl!);
              }}
              accessibilityRole="button"
              accessibilityLabel="Register for event"
            >
              <Text style={styles.registerBtnText}>Register</Text>
            </Pressable>
          ) : (
            <View style={styles.detailsBtn}>
              <Text style={styles.detailsBtnText}>Details</Text>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.eventList}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonDetails}>
            <Skeleton width="80%" height={18} />
            <Skeleton width="60%" height={14} />
            <Skeleton width="45%" height={14} />
          </View>
          <View style={styles.skeletonTagsRow}>
            <Skeleton width={80} height={22} borderRadius={Radius.sm} />
            <Skeleton width={70} height={22} borderRadius={Radius.sm} />
          </View>
          <Skeleton width="100%" height={1} />
          <View style={styles.skeletonMetaRow}>
            <Skeleton width={40} height={14} />
            <Skeleton width={80} height={14} />
            <Skeleton width={68} height={30} borderRadius={Radius.sm} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ city, onCreatePress }: { city: string | null; onCreatePress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No events found</Text>
      <Text style={styles.emptySubtitle}>
        {city
          ? `No upcoming events in ${city}. Try a different date or search term.`
          : 'Try a different date or search term'}
      </Text>
      <Pressable
        testID="btn-discover-create"
        style={styles.createBtn}
        onPress={onCreatePress}
      >
        <Text style={styles.createBtnText}>Create Your Own</Text>
      </Pressable>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="warning-outline" size={48} color={Colors.error} />
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.emptySubtitle}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('play');
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Play data
  const [playEvents, setPlayEvents] = useState<NormalisedEvent[]>([]);
  const [playLoading, setPlayLoading] = useState(true);
  const [playError, setPlayError] = useState<string | null>(null);

  // Compete data
  const [competeEvents, setCompeteEvents] = useState<NormalisedEvent[]>([]);
  const [competeLoading, setCompeteLoading] = useState(false);
  const [competeError, setCompeteError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Spot alert subscriptions
  const [alertSubs, setAlertSubs] = useState<Set<string>>(new Set());

  // PLA-471: Wait for AuthProvider to settle before fetching auth-scoped data.
  // getAlertSubscriptions reads RLS-gated rows; firing it before the session
  // is rehydrated returns empty and the user sees no subscriptions until they
  // restart the app. Public-read scout/compete fetches below are intentionally
  // not gated — they have their own retry logic.
  const { loading: authLoading } = useAuth();
  useEffect(() => {
    if (authLoading) return;
    getAlertSubscriptions().then(setAlertSubs).catch(() => {});
  }, [authLoading]);

  const handleToggleAlert = useCallback(async (eventId: string) => {
    const nowActive = await toggleEventAlert(eventId);
    setAlertSubs((prev) => {
      const next = new Set(prev);
      if (nowActive) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
  }, []);

  // ── Fetch play events ────────────────────────────────────────────────────

  const fetchPlayEvents = useCallback(async (retry = true) => {
    setPlayLoading(true);
    setPlayError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const { data, error } = await supabase
        .from('upcoming_scout_events')
        .select(
          'id, name, event_date, start_time, end_time, format, level, price_cents, currency, max_players, spots_available, registration_url, source_platform, status, venue_name, venue_address, city, postcode, latitude, longitude, organiser_name, organiser_type',
        )
        .neq('venue_name', 'UK Demo Club')
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(30)
        .abortSignal(controller.signal);

      clearTimeout(timeout);

      if (error) {
        if (retry) {
          setTimeout(() => fetchPlayEvents(false), 1500);
          return;
        }
        setPlayError(error.message);
        setPlayLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as PlayEventRow[];
      setPlayEvents(rows.map(normalisePlayEvent));
      setPlayLoading(false);
    } catch (e: unknown) {
      if (retry) {
        setTimeout(() => fetchPlayEvents(false), 1500);
        return;
      }
      const msg = e instanceof Error ? e.message : 'Request timed out';
      setPlayError(msg.includes('abort') ? 'Request timed out — pull to refresh' : msg);
      setPlayLoading(false);
    }
  }, []);

  // ── Fetch compete events ─────────────────────────────────────────────────

  const fetchCompeteEvents = useCallback(async (retry = true) => {
    setCompeteLoading(true);
    setCompeteError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const { data, error } = await supabase
        .from('competitions')
        .select(
          'id, name, category, format, grade, level, event_date, end_date, start_time, end_time, venue_name, city, postcode, organiser_name, registration_url, price_cents, currency, status, max_teams, spots_available, season, league_name, tour_stop_number, prize_money_cents, featured',
        )
        .in('status', ['upcoming', 'in_progress', 'full'])
        .order('event_date', { ascending: true })
        .limit(30)
        .abortSignal(controller.signal);

      clearTimeout(timeout);

      if (error) {
        if (retry) {
          setTimeout(() => fetchCompeteEvents(false), 1500);
          return;
        }
        setCompeteError(error.message);
        setCompeteLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as CompetitionRow[];
      setCompeteEvents(rows.map(normaliseCompetition));
      setCompeteLoading(false);
    } catch (e: unknown) {
      if (retry) {
        setTimeout(() => fetchCompeteEvents(false), 1500);
        return;
      }
      const msg = e instanceof Error ? e.message : 'Request timed out';
      setCompeteError(msg.includes('abort') ? 'Request timed out — pull to refresh' : msg);
      setCompeteLoading(false);
    }
  }, []);

  // ── Initial fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    fetchPlayEvents();
  }, [fetchPlayEvents]);

  // Fetch compete data when tab switches to compete (lazy load)
  useEffect(() => {
    if (activeTab === 'compete' && competeEvents.length === 0 && !competeLoading) {
      fetchCompeteEvents();
    }
  }, [activeTab, competeEvents.length, competeLoading, fetchCompeteEvents]);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'play') {
      await fetchPlayEvents();
    } else {
      await fetchCompeteEvents();
    }
    setRefreshing(false);
  }, [activeTab, fetchPlayEvents, fetchCompeteEvents]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const rawEvents = activeTab === 'play' ? playEvents : competeEvents;
  const isLoading = activeTab === 'play' ? playLoading : competeLoading;
  const errorMsg = activeTab === 'play' ? playError : competeError;

  // Collect unique cities for the location picker
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    for (const e of rawEvents) {
      if (e.city) cities.add(e.city);
    }
    return Array.from(cities).sort();
  }, [rawEvents]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let events = rawEvents;

    // City filter
    if (selectedCity) {
      events = events.filter(
        (e) => e.city.toLowerCase() === selectedCity.toLowerCase(),
      );
    }

    // Search filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.venueName.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q),
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      events = events.filter((e) => matchesDateFilter(e.eventDate, dateFilter));
    }

    return events;
  }, [rawEvents, selectedCity, searchQuery, dateFilter]);

  const eventGroups = useMemo(() => groupByDate(filteredEvents), [filteredEvents]);
  const totalEvents = filteredEvents.length;

  // ── Event press ──────────────────────────────────────────────────────────

  const handleEventPress = useCallback((event: NormalisedEvent) => {
    if (event.registrationUrl) {
      WebBrowser.openBrowserAsync(event.registrationUrl);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (activeTab === 'play') {
      fetchPlayEvents();
    } else {
      fetchCompeteEvents();
    }
  }, [activeTab, fetchPlayEvents, fetchCompeteEvents]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary fallbackMessage="Discover couldn't load. Tap retry to try again.">
    <SafeAreaView testID="screen-discover" style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.opticYellow}
            colors={[Colors.opticYellow]}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text testID="discover-subtitle" style={styles.headerSub}>Find events near you</Text>
        </Animated.View>

        {/* Tabs: Play / Compete */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.tabRow}>
          <TabButton
            label="Play"
            active={activeTab === 'play'}
            onPress={() => setActiveTab('play')}
            testID="tab-play"
            tintColor={Alpha.aqua12}
          />
          <TabButton
            label="Compete"
            active={activeTab === 'compete'}
            onPress={() => setActiveTab('compete')}
            testID="tab-compete"
            tintColor={Alpha.yellow12}
          />
        </Animated.View>

        {/* Search bar + location */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={Colors.textDim} />
            <TextInput
              testID="input-search"
              style={styles.searchInput}
              placeholder="Search events, venues, cities..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search events"
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[styles.locationPill, selectedCity !== null && styles.locationPillActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowLocationPicker(!showLocationPicker);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Filter by city, currently ${selectedCity ?? 'All'}`}
          >
            <Ionicons
              name="location"
              size={14}
              color={selectedCity ? Colors.opticYellow : Colors.violet}
            />
            <Text
              style={[
                styles.locationText,
                selectedCity !== null && styles.locationTextActive,
              ]}
            >
              {selectedCity ?? 'All'}
            </Text>
            <Ionicons
              name={showLocationPicker ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={Colors.textDim}
            />
          </Pressable>
        </Animated.View>

        {/* Location dropdown */}
        {showLocationPicker && (
          <View style={styles.locationDropdown}>
            <Pressable
              style={[
                styles.locationOption,
                selectedCity === null && styles.locationOptionActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCity(null);
                setShowLocationPicker(false);
              }}
            >
              <Text
                style={[
                  styles.locationOptionText,
                  selectedCity === null && styles.locationOptionTextActive,
                ]}
              >
                All Cities
              </Text>
              {selectedCity === null && (
                <Ionicons name="checkmark" size={16} color={Colors.opticYellow} />
              )}
            </Pressable>
            {availableCities.map((city) => (
              <Pressable
                key={city}
                style={[
                  styles.locationOption,
                  selectedCity === city && styles.locationOptionActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCity(city);
                  setShowLocationPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.locationOptionText,
                    selectedCity === city && styles.locationOptionTextActive,
                  ]}
                >
                  {city}
                </Text>
                {selectedCity === city && (
                  <Ionicons name="checkmark" size={16} color={Colors.opticYellow} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Date filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {DATE_FILTER_CHIPS.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              active={dateFilter === chip.key}
              onPress={() => setDateFilter(chip.key)}
              testID={chip.testID}
            />
          ))}
        </ScrollView>

        {/* Results count */}
        {!isLoading && errorMsg === null && (
          <View style={styles.resultsRow}>
            <Text style={styles.resultsText}>
              <Text style={styles.resultsCount}>{totalEvents}</Text>{' '}
              {activeTab === 'play' ? 'events' : 'competitions'} found
            </Text>
          </View>
        )}

        {/* Loading state */}
        {isLoading && <View testID="state-discover-loading"><LoadingSkeleton /></View>}

        {/* Error state */}
        {!isLoading && errorMsg !== null && (
          <View testID="state-discover-error">
            <ErrorState message={errorMsg} onRetry={handleRetry} />
          </View>
        )}

        {/* Empty state */}
        {!isLoading && errorMsg === null && totalEvents === 0 && (
          <View testID="state-discover-empty">
            <EmptyState
              city={selectedCity}
              onCreatePress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(app)/(tabs)/play');
              }}
            />
          </View>
        )}

        {/* Event list grouped by date */}
        {!isLoading && errorMsg === null && totalEvents > 0 && (
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.eventList}>
            {eventGroups.map((group) => (
              <View key={group.dateLabel}>
                <DateHeader
                  icon={group.dateIcon}
                  label={group.dateLabel}
                  count={group.events.length}
                />
                {group.events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isCompete={activeTab === 'compete'}
                    onPress={() => handleEventPress(event)}
                    alertActive={alertSubs.has(event.id)}
                    onToggleAlert={() => handleToggleAlert(event.id)}
                  />
                ))}
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
    </ErrorBoundary>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  scroll: {
    paddingBottom: Spacing[12],
  },

  // Header
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
  },
  headerTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    marginTop: 2,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderRadius: Radius.sm + 2,
  },
  tabButtonActive: {
    backgroundColor: Colors.surface,
  },
  tabButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textMuted,
  },
  tabButtonTextActive: {
    color: Colors.opticYellow,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[5],
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    height: 44,
    gap: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Alpha.violet12,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    height: 44,
    borderWidth: 1,
    borderColor: Alpha.violet25,
  },
  locationPillActive: {
    backgroundColor: Alpha.yellow08,
    borderColor: Alpha.yellow25,
  },
  locationText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.violet,
  },
  locationTextActive: {
    color: Colors.opticYellow,
  },

  // Location dropdown
  locationDropdown: {
    marginHorizontal: Spacing[5],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing[3],
    overflow: 'hidden',
    maxHeight: 300,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Alpha.slate30,
  },
  locationOptionActive: {
    backgroundColor: Alpha.yellow06,
  },
  locationOptionText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  locationOptionTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.opticYellow,
  },

  // Filters
  filterRow: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  filterChip: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Alpha.yellow10,
    borderColor: Alpha.yellow30,
  },
  filterChipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
  },
  filterChipTextActive: {
    color: Colors.opticYellow,
  },

  // Results row
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[2],
  },
  resultsText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
  },
  resultsCount: {
    fontFamily: Fonts.bodyBold,
    color: Colors.textPrimary,
  },

  // Event list
  eventList: {
    paddingHorizontal: Spacing[5],
  },

  // Date header
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
    marginTop: Spacing[4],
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  dateHeaderLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dateCountBadge: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[2] + 2,
    paddingVertical: 2,
  },
  dateCountText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },

  // Event card
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.aquaGreen,
    gap: Spacing[3],
  },
  eventCardFeatured: {
    borderColor: Alpha.yellow25,
    ...Shadows.glowYellow,
  },

  // Featured badge
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: Colors.opticYellow,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    marginBottom: -Spacing[1],
  },
  featuredBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.darkBg,
    letterSpacing: 0.5,
  },

  // Event top section
  eventTopSection: {
    gap: Spacing[1] + 2,
  },
  eventNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  eventName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },

  // Status badge
  statusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Venue
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueName: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
    flex: 1,
  },

  // Time
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
  },

  // Organiser
  organiserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  organiserText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[1],
  },
  tag: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing[1],
    borderTopWidth: 1,
    borderTopColor: Alpha.slate50,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  priceText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  },
  spotsText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.aquaGreen,
  },
  prizeMoney: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.gold,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  registerBtn: {
    backgroundColor: Alpha.yellow10,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderWidth: 1,
    borderColor: Alpha.yellow25,
  },
  registerBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.opticYellow,
  },
  waitlistBtn: {
    backgroundColor: Alpha.error10,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderWidth: 1,
    borderColor: Alpha.error25,
  },
  waitlistBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.error,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Alpha.slate08,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifyBtnActive: {
    backgroundColor: Alpha.yellow10,
    borderColor: Alpha.yellow25,
  },
  notifyBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  notifyBtnTextActive: {
    color: Colors.opticYellow,
  },
  detailsBtn: {
    backgroundColor: Alpha.slate08,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailsBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
  },

  // Skeleton loading
  skeletonCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
  },
  skeletonDetails: {
    gap: Spacing[2],
  },
  skeletonTagsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Empty / error states
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[12],
    paddingHorizontal: Spacing[6],
    gap: Spacing[3],
  },
  emptyTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: Alpha.yellow10,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
    borderWidth: 1,
    borderColor: Alpha.yellow25,
    marginTop: Spacing[2],
  },
  retryBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },
  createBtn: {
    marginTop: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    backgroundColor: Alpha.yellow10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Alpha.yellow20,
  },
  createBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.opticYellow,
  },
});
