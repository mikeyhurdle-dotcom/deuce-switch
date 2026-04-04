import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/providers/AuthProvider';
import { supabase } from '../../src/lib/supabase';
import { getPendingRequests, respondToConnection } from '../../src/services/connection-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../src/lib/constants';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Skeleton } from '../../src/components/ui/Skeleton';
import type { PendingRequest, TournamentFormat } from '../../src/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

type ActivityItem = {
  id: string;
  type: 'connection_request' | 'tournament_result' | 'tournament_invite';
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  initials: string;
  timestamp: string;
  actionable: boolean;
  data?: any;
};

// ── Time formatting ──────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getTimeBucket(iso: string): 'today' | 'week' | 'earlier' {
  const now = new Date();
  const d = new Date(iso);
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 1) return 'today';
  if (diffDays < 7) return 'week';
  return 'earlier';
}

const BUCKET_LABELS: Record<string, string> = {
  today: 'Today',
  week: 'This Week',
  earlier: 'Earlier',
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    if (!user) return;

    try {
      const [pendingRequests, tournamentResult] = await Promise.all([
        getPendingRequests().catch(() => [] as PendingRequest[]),
        supabase
          .from('tournament_players')
          .select(`
            tournament_id,
            tournaments (id, name, tournament_format, status, created_at)
          `)
          .eq('player_id', user.id)
          .eq('tournament_status', 'active')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const tournamentResults = tournamentResult.data ?? [];

      const activity: ActivityItem[] = [];

      // Connection requests
      for (const req of pendingRequests) {
        if (!req.connection_id) continue; // skip malformed data
        const name = req.display_name ?? 'Player';
        const initials = name
          .split(' ')
          .map((w: string) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || '?';

        activity.push({
          id: `conn-${req.connection_id}`,
          type: 'connection_request',
          title: name,
          subtitle: 'Wants to connect with you',
          avatarUrl: req.game_face_url ?? null,
          initials,
          timestamp: req.requested_at ?? new Date().toISOString(),
          actionable: true,
          data: { connectionId: req.connection_id, userId: req.user_id },
        });
      }

      // Tournament results (completed tournaments)
      for (const tp of tournamentResults as any[]) {
        const t = Array.isArray(tp.tournaments) ? tp.tournaments[0] : tp.tournaments;
        if (!t || t.status !== 'completed') continue;

        const format = ((t.tournament_format as string) ?? 'americano').replace('_', ' ');
        activity.push({
          id: `tournament-${t.id}`,
          type: 'tournament_result',
          title: t.name,
          subtitle: `${format.charAt(0).toUpperCase() + format.slice(1)} completed`,
          initials: 'T',
          timestamp: t.created_at,
          actionable: false,
          data: { tournamentId: t.id },
        });
      }

      // Sort by timestamp (newest first)
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setItems(activity);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivity();
    setRefreshing(false);
  }, [fetchActivity]);

  const handleAccept = async (connectionId: string) => {
    setResponding(connectionId);
    try {
      await respondToConnection(connectionId, 'accept');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setItems((prev) => prev.filter((i) => i.data?.connectionId !== connectionId));
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setResponding(null);
    }
  };

  const handleDecline = async (connectionId: string) => {
    setResponding(connectionId);
    try {
      await respondToConnection(connectionId, 'reject');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setItems((prev) => prev.filter((i) => i.data?.connectionId !== connectionId));
    } catch {
      // Silent
    } finally {
      setResponding(null);
    }
  };

  const handleItemPress = (item: ActivityItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.type === 'connection_request') {
      router.push('/(app)/connections');
    } else if (item.type === 'tournament_result' && item.data?.tournamentId) {
      router.push(`/(app)/tournament/${item.data.tournamentId}/results`);
    }
  };

  // Group by time bucket
  const grouped = items.reduce(
    (acc, item) => {
      const bucket = getTimeBucket(item.timestamp);
      if (!acc[bucket]) acc[bucket] = [];
      acc[bucket].push(item);
      return acc;
    },
    {} as Record<string, ActivityItem[]>,
  );

  const bucketOrder = ['today', 'week', 'earlier'] as const;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Notifications',
          headerBackTitle: '',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontFamily: Fonts.bodyBold,
            fontSize: 20,
          },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView testID="screen-notifications" style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.opticYellow}
            />
          }
        >
          {loading ? (
            <View style={styles.skeletonContainer}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} width="100%" height={72} borderRadius={Radius.md} />
              ))}
            </View>
          ) : items.length === 0 ? (
            <EmptyState
              icon="notifications-outline"
              iconColor={Colors.aquaGreen}
              badgeIcon="checkmark-circle"
              title="All caught up"
              subtitle="Connection requests and tournament updates will appear here"
              testID="state-notifications-empty"
            />
          ) : (
            bucketOrder.map((bucket) => {
              const bucketItems = grouped[bucket];
              if (!bucketItems || bucketItems.length === 0) return null;
              return (
                <View key={bucket} style={styles.bucketSection}>
                  <Text style={styles.bucketTitle}>{BUCKET_LABELS[bucket]}</Text>
                  {bucketItems.map((item, idx) => (
                    <Animated.View
                      key={item.id}
                      entering={FadeInDown.delay(idx * 40).springify()}
                    >
                      <Pressable
                        style={styles.itemCard}
                        onPress={() => handleItemPress(item)}
                      >
                        {/* Avatar */}
                        <View style={styles.itemAvatarWrap}>
                          {item.avatarUrl ? (
                            <Image
                              source={{ uri: item.avatarUrl }}
                              style={styles.itemAvatar}
                            />
                          ) : (
                            <View
                              style={[
                                styles.itemAvatarFallback,
                                item.type === 'connection_request'
                                  ? { backgroundColor: Colors.violet }
                                  : { backgroundColor: Alpha.yellow10 },
                              ]}
                            >
                              {item.type === 'tournament_result' ? (
                                <Ionicons
                                  name="trophy"
                                  size={16}
                                  color={Colors.opticYellow}
                                />
                              ) : (
                                <Text style={styles.itemAvatarText}>
                                  {item.initials}
                                </Text>
                              )}
                            </View>
                          )}
                          {/* Type indicator */}
                          <View
                            style={[
                              styles.typeIndicator,
                              item.type === 'connection_request'
                                ? { backgroundColor: Colors.aquaGreen }
                                : { backgroundColor: Colors.opticYellow },
                            ]}
                          />
                        </View>

                        {/* Content */}
                        <View style={styles.itemContent}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.itemSubtitle} numberOfLines={1}>
                            {item.subtitle}
                          </Text>
                        </View>

                        {/* Timestamp or Actions */}
                        {item.type === 'connection_request' ? (
                          <View style={styles.actionButtons}>
                            <Pressable
                              style={styles.acceptBtn}
                              onPress={() => handleAccept(item.data.connectionId)}
                              disabled={responding === item.data.connectionId}
                            >
                              <Ionicons name="checkmark" size={16} color={Colors.darkBg} />
                            </Pressable>
                            <Pressable
                              style={styles.declineBtn}
                              onPress={() => handleDecline(item.data.connectionId)}
                              disabled={responding === item.data.connectionId}
                            >
                              <Ionicons name="close" size={16} color={Colors.textMuted} />
                            </Pressable>
                          </View>
                        ) : (
                          <Text style={styles.timestamp}>{timeAgo(item.timestamp)}</Text>
                        )}
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
              );
            })
          )}
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
  scrollContent: {
    paddingBottom: Spacing[10],
  },
  skeletonContainer: {
    padding: Spacing[5],
    gap: Spacing[3],
  },
  // Bucket sections
  bucketSection: {
    paddingHorizontal: Spacing[5],
    marginTop: Spacing[4],
    gap: Spacing[2],
  },
  bucketTitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing[1],
  },

  // Item card
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  itemAvatarWrap: {
    position: 'relative',
  },
  itemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  itemAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  typeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  itemSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  timestamp: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  acceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
