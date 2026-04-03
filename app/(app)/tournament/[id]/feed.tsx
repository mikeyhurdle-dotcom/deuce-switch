/**
 * TournamentFeedScreen — Social feed within a tournament
 *
 * Scrollable feed of posts with reactions, comments, and a FAB
 * to compose new posts. Only tournament participants can view & post.
 * Uses Supabase Realtime for live updates.
 *
 * "Strength does not make one capable of rule; it makes one capable of service."
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';

import { Alpha, Colors, Duration, Fonts, Radius, Spacing } from '../../../../src/lib/constants';
import { useAuth } from '../../../../src/providers/AuthProvider';
import {
  getTournamentFeed,
  createTournamentPost,
} from '../../../../src/services/feed-service';
import { supabase } from '../../../../src/lib/supabase';
import type { FeedPost } from '../../../../src/lib/types';
import { FeedPostCard } from '../../../../src/components/FeedPostCard';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };
const PAGE_SIZE = 20;

export default function TournamentFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);

  const composerInputRef = useRef<TextInput>(null);
  const fabScale = useSharedValue(1);
  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchFeed = useCallback(
    async (offset = 0) => {
      if (!id) return [];
      const data = await getTournamentFeed(id, PAGE_SIZE, offset);
      return data;
    },
    [id],
  );

  const loadInitial = useCallback(async () => {
    try {
      const data = await fetchFeed(0);
      setPosts(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('[Feed] initial load error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFeed]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchFeed(0);
      setPosts(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('[Feed] refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFeed]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchFeed(posts.length);
      setPosts((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('[Feed] load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchFeed, posts.length, loadingMore, hasMore]);

  // ── Realtime subscription ──────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`tournament-feed-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tournament_posts',
          filter: `tournament_id=eq.${id}`,
        },
        () => {
          // New post inserted — refresh the feed
          handleRefresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, handleRefresh]);

  // ── Post creation ──────────────────────────────────────────────────────

  const handleOpenComposer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setComposerOpen(true);
    setTimeout(() => composerInputRef.current?.focus(), 200);
  };

  const handleCloseComposer = () => {
    setComposerOpen(false);
    setComposerText('');
  };

  const handleSubmitPost = async () => {
    const trimmed = composerText.trim();
    if (!trimmed || posting || !id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPosting(true);
    try {
      const result = await createTournamentPost(id, trimmed);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        handleCloseComposer();
        // Refresh to pick up the new post with full author info
        await handleRefresh();
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('[Feed] post creation error:', err);
    } finally {
      setPosting(false);
    }
  };

  // ── Post update (optimistic reaction toggle) ───────────────────────────

  const handlePostUpdated = useCallback((updatedPost: FeedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p.post_id === updatedPost.post_id ? updatedPost : p)),
    );
  }, []);

  // ── Navigate to post detail ────────────────────────────────────────────

  const handlePostPress = useCallback(
    (post: FeedPost) => {
      router.push(`/(app)/tournament/${id}/post/${post.post_id}`);
    },
    [id],
  );

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'FEED' }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.opticYellow} />
            <Text style={styles.loadingText}>Loading feed…</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'FEED',
          headerTitleStyle: {
            fontFamily: Fonts.mono,
            fontSize: 14,
            letterSpacing: 2,
          } as any,
        }}
      />

      <SafeAreaView testID="screen-tournament-feed" style={styles.safe} edges={['bottom']}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.post_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.opticYellow}
              colors={[Colors.opticYellow]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <FeedPostCard
              post={item}
              onPress={handlePostPress}
              onPostUpdated={handlePostUpdated}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={Colors.opticYellow} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{'\u{1F3BE}'}</Text>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to share something with the group!
              </Text>
            </View>
          }
        />

        {/* ── Compose overlay ───────────────────────────────────────────── */}
        {composerOpen && (
          <Animated.View
            entering={FadeIn.duration(Duration.fast)}
            style={styles.composerOverlay}
          >
            <Pressable style={styles.composerBackdrop} onPress={handleCloseComposer} />
            <Animated.View
              entering={SlideInDown.springify().damping(18).stiffness(400)}
              style={styles.composerSheet}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={100}
              >
                <View style={styles.composerHeader}>
                  <Text style={styles.composerTitle}>NEW POST</Text>
                  <Pressable testID="btn-close-composer" onPress={handleCloseComposer} hitSlop={8}>
                    <Ionicons
                      name="close"
                      size={20}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                </View>

                <TextInput
                  ref={composerInputRef}
                  testID="input-composer"
                  style={styles.composerInput}
                  placeholder="Share something with the group…"
                  placeholderTextColor={Colors.textMuted}
                  value={composerText}
                  onChangeText={setComposerText}
                  multiline
                  maxLength={2000}
                  autoFocus
                  textAlignVertical="top"
                />

                <View style={styles.composerFooter}>
                  <Text style={styles.composerCharCount}>
                    {composerText.length}/2000
                  </Text>
                  <Pressable
                    testID="btn-submit-post"
                    style={[
                      styles.composerSubmitButton,
                      (!composerText.trim() || posting) &&
                        styles.composerSubmitDisabled,
                    ]}
                    onPress={handleSubmitPost}
                    disabled={!composerText.trim() || posting}
                  >
                    {posting ? (
                      <ActivityIndicator size="small" color={Colors.darkBg} />
                    ) : (
                      <Text style={styles.composerSubmitText}>POST</Text>
                    )}
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </Animated.View>
          </Animated.View>
        )}

        {/* ── FAB (Floating Action Button) ──────────────────────────────── */}
        {!composerOpen && (
          <AnimatedPressable
            testID="btn-compose-post"
            style={[styles.fab, fabAnimatedStyle]}
            onPressIn={() => {
              fabScale.value = withSpring(0.9, SPRING_CONFIG);
            }}
            onPressOut={() => {
              fabScale.value = withSpring(1, SPRING_CONFIG);
            }}
            onPress={handleOpenComposer}
          >
            <Ionicons name="add" size={28} color={Colors.darkBg} />
          </AnimatedPressable>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textDim,
  },

  // ── Feed List ──
  listContent: {
    padding: Spacing[4],
    paddingBottom: Spacing[20],
  },
  separator: {
    height: Spacing[3],
  },
  loadingMore: {
    paddingVertical: Spacing[6],
    alignItems: 'center',
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing[12],
    paddingHorizontal: Spacing[8],
    gap: Spacing[2],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing[2],
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
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

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.opticYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },

  // ── Composer Overlay ──
  composerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  composerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Alpha.black60,
  },
  composerSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderTopWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[3],
    maxHeight: '70%',
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerTitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
    letterSpacing: 2,
  },
  composerInput: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textPrimary,
    minHeight: 120,
    maxHeight: 240,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    lineHeight: 24,
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerCharCount: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  composerSubmitButton: {
    backgroundColor: Colors.opticYellow,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
    minWidth: 80,
    alignItems: 'center',
  },
  composerSubmitDisabled: {
    opacity: 0.4,
  },
  composerSubmitText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.darkBg,
    letterSpacing: 1,
    fontWeight: '700',
  },
});
