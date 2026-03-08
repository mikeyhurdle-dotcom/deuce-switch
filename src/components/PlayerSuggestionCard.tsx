/**
 * PlayerSuggestionCard — "People You've Played With"
 *
 * Compact horizontal card showing a player from shared tournament history
 * with an inline "Connect" button. Designed for horizontal ScrollView.
 *
 * "Strength does not make one capable of rule; it makes one capable of service."
 */

import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, Fonts, Radius, Spacing } from '../lib/constants';
import type { PlayerSuggestion } from '../lib/types';
import { sendConnectionRequest } from '../services/connection-service';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };
const CARD_WIDTH = 160;

type Props = {
  suggestion: PlayerSuggestion;
  onConnected?: (userId: string) => void;
};

export function PlayerSuggestionCard({ suggestion, onConnected }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleConnect = async () => {
    if (sending || sent) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    try {
      await sendConnectionRequest(suggestion.user_id);
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onConnected?.(suggestion.user_id);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  };

  const initials = (suggestion.display_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasAvatar = !!suggestion.game_face_url;
  const sharedLabel =
    suggestion.shared_tournament_count === 1
      ? '1 tournament together'
      : `${suggestion.shared_tournament_count} tournaments together`;

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPressIn={() => { scale.value = withSpring(0.96, SPRING_CONFIG); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG); }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Future: navigate to player profile
      }}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {hasAvatar ? (
          <Image
            source={{ uri: suggestion.game_face_url! }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        {suggestion.preferred_position && (
          <View style={styles.positionBadge}>
            <Text style={styles.positionBadgeText}>
              {suggestion.preferred_position.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>
        {suggestion.display_name ?? 'Player'}
      </Text>

      {/* Shared tournaments count */}
      <Text style={styles.shared} numberOfLines={1}>
        {sharedLabel}
      </Text>

      {/* Connect Button */}
      <Pressable
        style={[
          styles.connectButton,
          sent && styles.connectButtonSent,
          sending && styles.connectButtonSending,
        ]}
        onPress={handleConnect}
        disabled={sending || sent}
      >
        <Text
          style={[
            styles.connectButtonText,
            sent && styles.connectButtonTextSent,
          ]}
        >
          {sent ? 'SENT' : sending ? '...' : 'CONNECT'}
        </Text>
      </Pressable>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 8,
  },

  // ── Avatar ──
  avatarContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarText: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  positionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.surface,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  positionBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 7,
    color: Colors.aquaGreen,
    letterSpacing: 0.3,
  },

  // ── Text ──
  name: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  shared: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // ── Connect Button ──
  connectButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.opticYellow,
    alignItems: 'center',
    marginTop: 4,
  },
  connectButtonSending: {
    borderColor: Colors.textMuted,
    opacity: 0.6,
  },
  connectButtonSent: {
    borderColor: Colors.aquaGreen,
    backgroundColor: 'rgba(0, 229, 204, 0.08)',
  },
  connectButtonText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.opticYellow,
    letterSpacing: 1.5,
  },
  connectButtonTextSent: {
    color: Colors.aquaGreen,
  },
});
