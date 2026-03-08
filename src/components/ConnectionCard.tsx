/**
 * ConnectionCard — Accepted connection in the grid
 *
 * Compact card showing an accepted connection with avatar, name,
 * position badge, and a long-press to remove option.
 *
 * "Strength does not make one capable of rule; it makes one capable of service."
 */

import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, Fonts, Radius, Spacing } from '../lib/constants';
import { removeConnection } from '../services/connection-service';
import type { ConnectionProfile } from '../lib/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };

type Props = {
  connection: ConnectionProfile;
  onRemoved?: (connectionId: string) => void;
};

export function ConnectionCard({ connection, onRemoved }: Props) {
  const [removing, setRemoving] = useState(false);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const initials = (connection.display_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasAvatar = !!connection.game_face_url;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/player/${connection.user_id}`);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Remove Connection',
      `Remove ${connection.display_name ?? 'this player'} from your connections?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: handleRemove,
        },
      ],
    );
  };

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    try {
      await removeConnection(connection.connection_id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onRemoved?.(connection.connection_id);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Could not remove connection. Try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle, removing && styles.cardRemoving]}
      onPressIn={() => { scale.value = withSpring(0.95, SPRING_CONFIG); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG); }}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      disabled={removing}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {hasAvatar ? (
          <Image
            source={{ uri: connection.game_face_url! }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        {connection.preferred_position && (
          <View style={styles.positionBadge}>
            <Text style={styles.positionBadgeText}>
              {connection.preferred_position.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>
        {connection.display_name ?? 'Player'}
      </Text>

      {/* Stats summary */}
      <Text style={styles.stats} numberOfLines={1}>
        {connection.matches_played} played · {connection.matches_won} W
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    alignItems: 'center',
    gap: 6,
  },
  cardRemoving: {
    opacity: 0.4,
  },

  // ── Avatar ──
  avatarContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarText: {
    fontFamily: Fonts.mono,
    fontSize: 17,
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
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  stats: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
