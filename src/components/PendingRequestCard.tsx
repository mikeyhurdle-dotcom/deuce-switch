/**
 * PendingRequestCard — Incoming connection request
 *
 * Full-width card with avatar, name, and accept/reject buttons.
 * Designed for vertical list in the connections screen.
 *
 * "A man's emotions are what define him, and control is the hallmark of true strength."
 */

import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Colors, Fonts, Radius, Spacing, Duration } from '../lib/constants';
import { respondToConnection } from '../services/connection-service';
import type { PendingRequest } from '../lib/types';

const AnimatedView = Animated.createAnimatedComponent(View);
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };

type Props = {
  request: PendingRequest;
  onResponded?: (connectionId: string, action: 'accept' | 'reject') => void;
};

export function PendingRequestCard({ request, onResponded }: Props) {
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState<'accept' | 'reject' | null>(null);

  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const initials = (request.display_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasAvatar = !!request.game_face_url;

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

  const handleRespond = async (action: 'accept' | 'reject') => {
    if (responding || responded) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setResponding(true);
    try {
      await respondToConnection(request.connection_id, action);
      setResponded(action);
      if (action === 'accept') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Fade out before removing
      opacity.value = withTiming(0, { duration: Duration.slow });
      setTimeout(() => {
        onResponded?.(request.connection_id, action);
      }, Duration.slow);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setResponding(false);
    }
  };

  return (
    <AnimatedView style={[styles.card, animatedStyle]}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {hasAvatar ? (
          <Image
            source={{ uri: request.game_face_url! }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {request.display_name ?? 'Player'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {request.location ? `${request.location} · ` : ''}
          {timeSince(request.requested_at)}
        </Text>
      </View>

      {/* Action Buttons */}
      {responded ? (
        <View style={styles.respondedContainer}>
          <Text
            style={[
              styles.respondedText,
              responded === 'accept'
                ? styles.respondedAccepted
                : styles.respondedRejected,
            ]}
          >
            {responded === 'accept' ? 'ACCEPTED' : 'DECLINED'}
          </Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRespond('reject')}
            disabled={responding}
          >
            <Text style={[styles.actionText, styles.rejectText]}>
              {responding ? '...' : 'DECLINE'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleRespond('accept')}
            disabled={responding}
          >
            <Text style={[styles.actionText, styles.acceptText]}>
              {responding ? '...' : 'ACCEPT'}
            </Text>
          </Pressable>
        </View>
      )}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    gap: 12,
  },

  // ── Avatar ──
  avatarContainer: {},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarText: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  // ── Info ──
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Actions ──
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  acceptButton: {
    borderColor: Colors.aquaGreen,
    backgroundColor: 'rgba(0, 229, 204, 0.08)',
  },
  rejectButton: {
    borderColor: Colors.border,
  },
  actionText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  acceptText: {
    color: Colors.aquaGreen,
  },
  rejectText: {
    color: Colors.textMuted,
  },

  // ── Responded ──
  respondedContainer: {
    paddingHorizontal: 12,
  },
  respondedText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  respondedAccepted: {
    color: Colors.aquaGreen,
  },
  respondedRejected: {
    color: Colors.textMuted,
  },
});
