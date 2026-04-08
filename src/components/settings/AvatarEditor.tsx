import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { updateAvatar } from '../../services/profile-service';
import { useAuth } from '../../providers/AuthProvider';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import type { Profile } from '../../lib/types';

type Props = {
  profile: Profile | null;
  userId: string;
};

export function AvatarEditor({ profile, userId }: Props) {
  const { refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const displayName = profile?.display_name ?? 'Player';
  const initials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const avatarUrl = profile?.game_face_url;

  const handlePickImage = (source: 'camera' | 'library') => {
    setUploading(true);
    updateAvatar(userId, source)
      .then(() => refreshProfile())
      .catch((err) => Alert.alert('Upload Failed', err?.message ?? 'Please try again.'))
      .finally(() => setUploading(false));
  };

  const showOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options = ['Take Photo', 'Choose from Library', 'Cancel'];
    const cancelIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (idx) => {
          if (idx === 0) handlePickImage('camera');
          else if (idx === 1) handlePickImage('library');
        },
      );
    } else {
      Alert.alert('Change Photo', undefined, [
        { text: 'Take Photo', onPress: () => handlePickImage('camera') },
        { text: 'Choose from Library', onPress: () => handlePickImage('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <Pressable
        testID="btn-edit-avatar"
        onPress={showOptions}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        style={styles.avatarWrapper}
      >
        <View style={styles.avatarRing}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.cameraBadge}>
          <Ionicons
            name={uploading ? 'hourglass' : 'camera'}
            size={14}
            color={Colors.darkBg}
          />
        </View>
      </Pressable>
      <Text style={styles.displayName}>{displayName}</Text>
      <Text style={styles.tapHint}>Tap photo to change</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing[5],
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Fonts.bodyBold,
    fontSize: 24,
    color: Colors.opticYellow,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.darkBg,
  },
  displayName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginTop: Spacing[3],
  },
  tapHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
