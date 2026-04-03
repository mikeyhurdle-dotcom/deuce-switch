/**
 * FeedPostCard — Tournament feed post with reactions
 *
 * Shows author avatar, name, content, timestamp, reaction buttons,
 * and comment count. Tapping opens the full post detail / comments.
 *
 * "What is the most important step a man can take?
 *  The next one. Always the next one."
 */

import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Alpha, Colors, Fonts, Radius, Spacing } from '../lib/constants';
import { toggleReaction } from '../services/feed-service';
import type { FeedPost, ReactionType } from '../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };

const REACTION_CONFIG: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '\u{1F44D}', label: 'Like' },
  { type: 'fire', emoji: '\u{1F525}', label: 'Fire' },
  { type: 'laugh', emoji: '\u{1F602}', label: 'Laugh' },
];

type Props = {
  post: FeedPost;
  onPress?: (post: FeedPost) => void;
  onPostUpdated?: (updatedPost: FeedPost) => void;
};

export function FeedPostCard({ post, onPress, onPostUpdated }: Props) {
  const [reacting, setReacting] = useState(false);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const initials = (post.author_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasAvatar = !!post.author_avatar;

  // ── Relative time ────────────────────────────────────────────────────

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

  // ── Reactions ─────────────────────────────────────────────────────────

  const handleReaction = useCallback(
    async (type: ReactionType) => {
      if (reacting) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setReacting(true);

      try {
        const result = await toggleReaction(post.post_id, type);
        if (result.success && onPostUpdated) {
          // Optimistically update the local post state
          const isAdding = result.action === 'added';
          const updatedReactionCounts = { ...post.reaction_counts };
          updatedReactionCounts[type] = Math.max(
            0,
            updatedReactionCounts[type] + (isAdding ? 1 : -1),
          );

          const updatedUserReactions = isAdding
            ? [...post.user_reactions, type]
            : post.user_reactions.filter((r) => r !== type);

          onPostUpdated({
            ...post,
            reaction_counts: updatedReactionCounts,
            user_reactions: updatedUserReactions,
          });
        }
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setReacting(false);
      }
    },
    [post, reacting, onPostUpdated],
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(post);
  };

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPressIn={() => {
        scale.value = withSpring(0.98, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      onPress={handlePress}
    >
      {/* Header: Avatar + Name + Timestamp */}
      <View style={styles.header}>
        {hasAvatar ? (
          <Image
            source={{ uri: post.author_avatar! }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.author_name ?? 'Player'}
          </Text>
          <Text style={styles.timestamp}>
            {timeSince(post.created_at)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Post Image (optional) */}
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Footer: Reactions + Comment Count */}
      <View style={styles.footer}>
        <View style={styles.reactions}>
          {REACTION_CONFIG.map(({ type, emoji }) => {
            const count = post.reaction_counts[type] ?? 0;
            const isActive = post.user_reactions.includes(type);

            return (
              <Pressable
                key={type}
                style={[
                  styles.reactionButton,
                  isActive && styles.reactionButtonActive,
                ]}
                onPress={() => handleReaction(type)}
                disabled={reacting}
                hitSlop={4}
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
              </Pressable>
            );
          })}
        </View>

        {/* Comment Count */}
        <Pressable style={styles.commentButton} onPress={handlePress}>
          <Ionicons
            name="chatbubble-outline"
            size={14}
            color={Colors.textMuted}
          />
          <Text style={styles.commentCount}>
            {post.comment_count > 0 ? post.comment_count : ''}
          </Text>
        </Pressable>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: Spacing[3],
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  timestamp: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Content ──
  content: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // ── Post Image ──
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing[1],
  },
  reactions: {
    flexDirection: 'row',
    gap: Spacing[2],
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
    backgroundColor: Alpha.yellow06,
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
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  commentCount: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
