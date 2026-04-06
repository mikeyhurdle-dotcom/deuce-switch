import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import { extractYouTubeId, getYouTubeThumbnail } from '../../services/training-service';
import type { TrainingVideo } from '../../lib/types';

const LEVEL_COLORS: Record<string, string> = {
  beginner: Colors.success,
  intermediate: Colors.warning,
  advanced: Colors.error,
};

type Props = {
  video: TrainingVideo;
  onPress: (video: TrainingVideo) => void;
  size?: 'small' | 'large';
};

export function VideoCard({ video, onPress, size = 'small' }: Props) {
  const videoId = extractYouTubeId(video.youtube_url);
  const thumbnail = videoId ? getYouTubeThumbnail(videoId) : null;
  const levelColor = LEVEL_COLORS[video.skill_level ?? ''] ?? Colors.textMuted;
  const isLarge = size === 'large';

  return (
    <Pressable
      testID={`card-video-${video.id}`}
      style={[styles.card, isLarge && styles.cardLarge]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(video);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${video.title}, ${video.skill_level ?? 'all levels'}`}
    >
      {/* Thumbnail */}
      <View style={[styles.thumb, isLarge && styles.thumbLarge]}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbImage} />
        ) : (
          <View style={styles.thumbFallback}>
            <Ionicons name="play-circle" size={32} color={Colors.textMuted} />
          </View>
        )}
        {/* Play overlay */}
        <View style={styles.playOverlay}>
          <Ionicons name="play" size={20} color="#FFFFFF" />
        </View>
        {/* Duration badge */}
        {video.duration_minutes && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{video.duration_minutes}m</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
        <View style={styles.meta}>
          {video.channel_name && (
            <Text style={styles.channel} numberOfLines={1}>{video.channel_name}</Text>
          )}
          {video.skill_level && (
            <View style={[styles.levelBadge, { backgroundColor: levelColor + '18' }]}>
              <Text style={[styles.levelText, { color: levelColor }]}>
                {video.skill_level}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: Spacing[2],
  },
  cardLarge: {
    width: 260,
    marginRight: Spacing[3],
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  thumbLarge: {
    borderRadius: Radius.lg,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Alpha.black50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: Alpha.black75,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  info: {
    gap: 3,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 17,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  channel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});
