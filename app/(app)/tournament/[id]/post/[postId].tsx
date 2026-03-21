/**
 * PostDetailScreen — Full post view with comment thread
 *
 * Shows the post in full, a chronological list of comments, and
 * an input bar to add new comments. Only tournament participants
 * can view & comment.
 *
 * "Sometimes a hypocrite is nothing more than a man in the process of changing."
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Fonts, Radius, Spacing } from '../../../../../src/lib/constants';
import { useAuth } from '../../../../../src/providers/AuthProvider';
import {
  getTournamentFeed,
  getPostComments,
  addComment,
  toggleReaction,
} from '../../../../../src/services/feed-service';
import { AnimatedPressable, useSpringPress } from '../../../../../src/hooks/useSpringPress';
import type { FeedPost, FeedComment, ReactionType } from '../../../../../src/lib/types';

const REACTION_CONFIG: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '\u{1F44D}', label: 'Like' },
  { type: 'fire', emoji: '\u{1F525}', label: 'Fire' },
  { type: 'laugh', emoji: '\u{1F602}', label: 'Laugh' },
];

const COMMENT_PAGE_SIZE = 50;
const COMMENT_STAGGER = 60; // ms between each comment row animation

// ── Animated Comment Row ──────────────────────────────────────────────────────
function AnimatedCommentRow({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const translateY = useSharedValue(16);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = 150 + index * COMMENT_STAGGER;
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

// ── Reaction Button with spring press ─────────────────────────────────────────
function ReactionButton({
  type,
  emoji,
  count,
  isActive,
  disabled,
  onPress,
}: {
  type: string;
  emoji: string;
  count: number;
  isActive: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress(0.9);

  return (
    <AnimatedPressable
      style={[
        styles.reactionButton,
        isActive && styles.reactionButtonActive,
        animatedStyle,
      ]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`${type} reaction${count > 0 ? `, ${count}` : ''}`}
      accessibilityState={{ selected: isActive }}
    >
      <Text style={styles.reactionEmoji}>{emoji}</Text>
      {count > 0 && (
        <Text
          style={[
            styles.reactionCount,
            isActive && styles.reactionCountActive,
          ]}
        >
          {count}
        </Text>
      )}
    </AnimatedPressable>
  );
}

// ── Send Button with spring press ─────────────────────────────────────────────
function SendButton({
  disabled,
  submitting,
  onPress,
}: {
  disabled: boolean;
  submitting: boolean;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress(0.9);

  return (
    <AnimatedPressable
      style={[
        styles.sendButton,
        disabled && styles.sendButtonDisabled,
        animatedStyle,
      ]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Send comment"
      accessibilityState={{ disabled, busy: submitting }}
    >
      {submitting ? (
        <ActivityIndicator size="small" color={Colors.darkBg} />
      ) : (
        <Ionicons name="send" size={18} color={Colors.darkBg} />
      )}
    </AnimatedPressable>
  );
}

export default function PostDetailScreen() {
  const { id, postId } = useLocalSearchParams<{ id: string; postId: string }>();
  const { user } = useAuth();

  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reacting, setReacting] = useState(false);

  const commentInputRef = useRef<TextInput>(null);

  // ── Helpers ──────────────────────────────────────────────────────────

  const timeSince = (dateStr: string) => {
    const seconds = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 1000,
    );
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getInitials = (name: string | null) =>
    (name ?? '?')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  // ── Data fetching ────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!id || !postId) return;
    try {
      // Fetch full feed and find this post (reuses the RPC)
      const feedData = await getTournamentFeed(id, 100, 0);
      const found = feedData.find((p) => p.post_id === postId);
      if (found) setPost(found);

      // Fetch comments
      const commentData = await getPostComments(postId, COMMENT_PAGE_SIZE, 0);
      setComments(commentData);
    } catch (err) {
      console.error('[PostDetail] fetch error:', err);
    }
  }, [id, postId]);

  useEffect(() => {
    (async () => {
      await fetchData();
      setLoading(false);
    })();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Add comment ──────────────────────────────────────────────────────

  const handleSubmitComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || submitting || !postId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      const result = await addComment(postId, trimmed);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCommentText('');

        // Optimistically add the comment
        const newComment: FeedComment = {
          comment_id: result.comment_id ?? '',
          author_id: user?.id ?? '',
          author_name: null, // Will be resolved on refresh
          author_avatar: null,
          content: trimmed,
          created_at: new Date().toISOString(),
        };
        setComments((prev) => [...prev, newComment]);

        // Update post comment count
        if (post) {
          setPost({ ...post, comment_count: post.comment_count + 1 });
        }

        // Full refresh to get author info
        setTimeout(() => fetchData(), 800);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reactions ────────────────────────────────────────────────────────

  const handleReaction = useCallback(
    async (type: ReactionType) => {
      if (reacting || !post) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setReacting(true);

      try {
        const result = await toggleReaction(post.post_id, type);
        if (result.success) {
          const isAdding = result.action === 'added';
          const updatedCounts = { ...post.reaction_counts };
          updatedCounts[type] = Math.max(
            0,
            updatedCounts[type] + (isAdding ? 1 : -1),
          );

          const updatedUserReactions = isAdding
            ? [...post.user_reactions, type]
            : post.user_reactions.filter((r) => r !== type);

          setPost({
            ...post,
            reaction_counts: updatedCounts,
            user_reactions: updatedUserReactions,
          });
        }
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setReacting(false);
      }
    },
    [post, reacting],
  );

  // ── Loading state ────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'POST' }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.opticYellow} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'POST' }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Text style={styles.errorText}>Post not found</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // ── Comment row renderer ─────────────────────────────────────────────

  const renderComment = ({ item, index }: { item: FeedComment; index: number }) => {
    const initials = getInitials(item.author_name);
    const hasAvatar = !!item.author_avatar;

    return (
      <AnimatedCommentRow index={index}>
        <View style={styles.commentCard}>
          {hasAvatar ? (
            <Image
              source={{ uri: item.author_avatar! }}
              style={styles.commentAvatar}
            />
          ) : (
            <View style={styles.commentAvatarFallback}>
              <Text style={styles.commentAvatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.commentBody}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor} numberOfLines={1}>
                {item.author_name ?? 'Player'}
              </Text>
              <Text style={styles.commentTime}>
                {timeSince(item.created_at)}
              </Text>
            </View>
            <Text style={styles.commentContent}>{item.content}</Text>
          </View>
        </View>
      </AnimatedCommentRow>
    );
  };

  // ── Post header (rendered as FlatList header) ────────────────────────

  const postHeader = (
    <Animated.View entering={FadeIn.duration(400)} style={styles.postSection}>
      {/* Author row */}
      <View style={styles.authorRow}>
        {post.author_avatar ? (
          <Image
            source={{ uri: post.author_avatar }}
            style={styles.authorAvatarImage}
          />
        ) : (
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>
              {getInitials(post.author_name)}
            </Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.author_name ?? 'Player'}
          </Text>
          <Text style={styles.postTimestamp}>
            {timeSince(post.created_at)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Post image */}
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Reactions */}
      <View style={styles.reactionsRow}>
        {REACTION_CONFIG.map(({ type, emoji }) => {
          const count = post.reaction_counts[type] ?? 0;
          const isActive = post.user_reactions.includes(type);
          return (
            <ReactionButton
              key={type}
              type={type}
              emoji={emoji}
              count={count}
              isActive={isActive}
              disabled={reacting}
              onPress={() => handleReaction(type)}
            />
          );
        })}
      </View>

      {/* Comments divider */}
      <View style={styles.commentsDivider}>
        <Ionicons
          name="chatbubble-outline"
          size={14}
          color={Colors.textMuted}
        />
        <Text style={styles.commentsLabel}>
          {comments.length} COMMENT{comments.length !== 1 ? 'S' : ''}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'POST',
          headerTitleStyle: {
            fontFamily: Fonts.mono,
            fontSize: 14,
            letterSpacing: 2,
          } as any,
        }}
      />

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          <FlatList
            data={comments}
            keyExtractor={(item) => item.comment_id}
            renderItem={renderComment}
            ListHeaderComponent={postHeader}
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
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>
                  No comments yet. Start the conversation!
                </Text>
              </View>
            }
          />

          {/* Comment input bar */}
          <View style={styles.inputBar}>
            <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              maxLength={1000}
              multiline
              textAlignVertical="center"
              accessibilityLabel="Write a comment"
            />
            <SendButton
              disabled={!commentText.trim() || submitting}
              submitting={submitting}
              onPress={handleSubmitComment}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textDim,
  },

  // ── List ──
  listContent: {
    padding: Spacing[4],
    paddingBottom: Spacing[4],
  },

  // ── Post Section ──
  postSection: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  authorAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  authorAvatarText: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  authorInfo: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  postTimestamp: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  postContent: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },

  // ── Reactions ──
  reactionsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingTop: Spacing[1],
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  reactionButtonActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: 'rgba(204, 255, 0, 0.06)',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  reactionCountActive: {
    color: Colors.opticYellow,
  },

  // ── Comments Divider ──
  commentsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentsLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },

  // ── Comment Card ──
  commentCard: {
    flexDirection: 'row',
    gap: Spacing[3],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentAvatarText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textPrimary,
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  commentAuthor: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  commentTime: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  commentContent: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // ── Empty Comments ──
  emptyComments: {
    paddingVertical: Spacing[8],
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
  },

  // ── Input Bar ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  commentInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
