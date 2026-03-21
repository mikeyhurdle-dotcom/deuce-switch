import { useState, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../../src/lib/constants';

// ── Types ────────────────────────────────────────────────────────────────────
type IconName = keyof typeof Ionicons.glyphMap;
type NotifCategory = 'tournament' | 'social' | 'system';

type Notification = {
  id: string;
  category: NotifCategory;
  icon?: IconName;
  iconColor?: string;
  iconBg?: string;
  avatarInitials?: string;
  avatarBg?: string;
  title: string;
  body: string;
  highlight?: string;
  time: string;
  unread: boolean;
  hasAccept?: boolean;
  hasView?: boolean;
};

// ── Filter Tabs ──────────────────────────────────────────────────────────────
const FILTERS = ['All', 'Tournaments', 'Social', 'System'] as const;
type FilterKey = (typeof FILTERS)[number];

const FILTER_TO_CATEGORY: Record<FilterKey, NotifCategory | null> = {
  All: null,
  Tournaments: 'tournament',
  Social: 'social',
  System: 'system',
};

// No mock data — notifications will be fetched from Supabase when ready

// ── Components ───────────────────────────────────────────────────────────────

function FilterTabs({
  active,
  onSelect,
}: {
  active: FilterKey;
  onSelect: (f: FilterKey) => void;
}) {
  return (
    <View style={styles.tabsRow}>
      {FILTERS.map((f) => (
        <Pressable
          key={f}
          style={[styles.tab, f === active && styles.tabActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(f);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: f === active }}
        >
          <Text style={[styles.tabText, f === active && styles.tabTextActive]}>
            {f}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function NotifAvatar({ notif }: { notif: Notification }) {
  if (notif.icon) {
    return (
      <View style={[styles.iconAvatar, { backgroundColor: notif.iconBg }]}>
        <Ionicons name={notif.icon} size={20} color={notif.iconColor} />
      </View>
    );
  }
  return (
    <View style={[styles.initialsAvatar, { backgroundColor: notif.avatarBg }]}>
      <Text style={styles.initialsText}>{notif.avatarInitials}</Text>
    </View>
  );
}

function NotifItem({ notif }: { notif: Notification }) {
  return (
    <Pressable
      style={[styles.notifItem, notif.unread && styles.notifItemUnread]}
      accessibilityRole="button"
      accessibilityLabel={`${notif.title} ${notif.body} ${notif.time}`}
    >
      {notif.unread && <View style={styles.unreadDot} />}
      <NotifAvatar notif={notif} />
      <View style={styles.notifBody}>
        <Text style={styles.notifText}>
          <Text style={styles.notifStrong}>{notif.title}</Text>
          {'  '}
          {notif.body}
        </Text>
        <Text style={styles.notifTime}>{notif.time}</Text>
        {(notif.hasAccept || notif.hasView) && (
          <View style={styles.actionRow}>
            {notif.hasAccept && (
              <Pressable style={styles.actionAccept} accessibilityRole="button">
                <Text style={styles.actionAcceptText}>Accept</Text>
              </Pressable>
            )}
            {notif.hasView && (
              <Pressable style={styles.actionView} accessibilityRole="button">
                <Text style={styles.actionViewText}>View</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Notifications',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontFamily: Fonts.bodyBold,
            fontSize: 20,
          },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeIn.duration(200)}>
            <View style={styles.empty}>
              <Ionicons
                name="notifications-outline"
                size={48}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyTitle}>Notifications coming soon</Text>
              <Text style={styles.emptyDesc}>
                Tournament alerts, match results, and social updates will appear here.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
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
  markRead: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.opticYellow,
  },

  // Filter Tabs
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.opticYellow,
  },
  tabText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
  },
  tabTextActive: {
    color: Colors.darkBg,
  },

  // Scroll
  scrollContent: {
    paddingBottom: Spacing[10],
  },

  // Section Label
  sectionLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },

  // Notification Item
  notifItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: Spacing[5],
    position: 'relative',
  },
  notifItemUnread: {
    backgroundColor: 'rgba(204,255,0,0.03)',
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: 22,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.opticYellow,
  },

  // Avatars
  iconAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  // Body
  notifBody: {
    flex: 1,
    minWidth: 0,
  },
  notifText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  notifStrong: {
    fontFamily: Fonts.bodyBold,
    color: Colors.textPrimary,
  },
  notifTime: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionAccept: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.sm + 2,
    backgroundColor: Colors.opticYellow,
  },
  actionAcceptText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.darkBg,
  },
  actionView: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.sm + 2,
    backgroundColor: Colors.surface,
  },
  actionViewText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[5],
    marginTop: Spacing[2],
  },

  // Caught Up
  caughtUp: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing[8],
  },

  // Empty State
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[20],
  },
  emptyTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
