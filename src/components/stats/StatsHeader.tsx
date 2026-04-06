import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing } from '../../lib/constants';
import type { Profile } from '../../lib/types';

type Props = {
  profile: Profile | null;
  displayName: string;
};

export function StatsHeader({ profile, displayName }: Props) {
  const router = useRouter();
  const avatarUrl = profile?.game_face_url;
  const initials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          testID="btn-stats-share"
          style={styles.iconBtn}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
              await Share.share({
                message: `Check out my padel stats on SMASHD! 🏆\nhttps://playsmashd.com`,
              });
            } catch {
              // User cancelled or share failed — no action needed
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Share stats"
          hitSlop={12}
        >
          <Ionicons name="share-outline" size={20} color={Colors.textDim} />
        </Pressable>
        <Pressable
          testID="btn-stats-settings"
          style={styles.iconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(app)/settings');
          }}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={12}
        >
          <Ionicons name="settings-outline" size={20} color={Colors.textDim} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.opticYellow,
  },
  name: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.textPrimary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
