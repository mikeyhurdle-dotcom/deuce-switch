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
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius, Spacing } from '../lib/constants';
import type { PlayerSuggestion } from '../lib/types';
import { sendConnectionRequest } from '../services/connection-service';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };
const CARD_WIDTH = 160;

type Props = {
  suggestion: PlayerSuggestion;
  onConnected?: (userId: string) => void;
  h2h?: { wins: number; losses: number } | null;
  onInvite?: (userId: string, displayName: string) => void;
};

export function PlayerSuggestionCard({ suggestion, onConnected, h2h, onInvite }: Props) {
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

  const handleInvite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onInvite?.(suggestion.user_id, suggestion.display_name ?? 'Player');
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
      accessibilityRole="button"
      accessibilityLabel={`${suggestion.display_name ?? 'Player'}, ${sharedLabel}`}
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

      {/* H2H Record (compact) */}
      {h2h && (h2h.wins > 0 || h2h.losses > 0) && (
        <View style={styles.h2hRow}>
          <Text style={styles.h2hWins}>W{h2h.wins}</Text>
          <Text style={styles.h2hDash}> — </Text>
          <Text style={styles.h2hLosses}>L{h2h.losses}</Text>
        </View>
      )}

      {/* Action Row */}
      <View style={styles.actionRow}>
        {/* Connect Button */}
        <Pressable
          style={[
            styles.connectButton,
            onInvite && styles.connectButtonWithInvite,
            sent && styles.connectButtonSent,
            sending && styles.connectButtonSending,
          ]}
          onPress={handleConnect}
          disabled={sending || sent}
          accessibilityRole="button"
          accessibilityLabel={sent ? 'Connection request sent' : `Connect with ${suggestion.display_name ?? 'player'}`}
          accessibilityState={{ disabled: sending || sent, busy: sending }}
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

        {/* Invite Button */}
        {onInvite && (
          <Pressable
            testID={`btn-invite-${suggestion.user_id}`}
            style={styles.inviteButton}
            onPress={handleInvite}
            accessibilityRole="button"
            accessibilityLabel={`Invite ${suggestion.display_name ?? 'player'} to Smashd`}
          >
            <Ionicons name="paper-plane-outline" size={14} color={Colors.aquaGreen} />
          </Pressable>
        )}
      </View>
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
    padding: Spacing[4],
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

  // ── H2H Row ──
  h2hRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h2hWins: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.success,
    letterSpacing: 0.5,
  },
  h2hDash: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  h2hLosses: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.coral,
    letterSpacing: 0.5,
  },

  // ── Action Row ──
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 6,
    marginTop: 4,
  },

  // ── Connect Button ──
  connectButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.opticYellow,
    alignItems: 'center',
  },
  connectButtonWithInvite: {
    // Slightly narrower when invite button is present
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

  // ── Invite Button ──
  inviteButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.aquaGreen,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,207,193,0.08)',
  },
});
