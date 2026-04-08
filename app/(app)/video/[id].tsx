import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Colors, Fonts, Radius, Spacing } from '../../../src/lib/constants';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { supabase } from '../../../src/lib/supabase';
import { extractYouTubeId } from '../../../src/services/training-service';
import type { TrainingVideo } from '../../../src/lib/types';

const LEVEL_COLORS: Record<string, string> = {
  beginner: Colors.success,
  intermediate: Colors.warning,
  advanced: Colors.error,
};

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [video, setVideo] = useState<TrainingVideo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('training_videos')
          .select('*')
          .eq('id', id)
          .single();
        setVideo(data);
      } catch {
        // Video not found — loading will finish, UI shows fallback
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const videoId = video ? extractYouTubeId(video.youtube_url) : null;
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
    : null;
  const levelColor = LEVEL_COLORS[video?.skill_level ?? ''] ?? Colors.textMuted;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: video?.title ?? 'Video',
          headerBackTitle: '',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.bodySemiBold, fontSize: 16 },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView testID="screen-video-detail" style={styles.safe} edges={['bottom']}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton width="100%" height={220} borderRadius={0} />
            <View style={{ padding: Spacing[4], gap: Spacing[3] }}>
              <Skeleton width="80%" height={20} borderRadius={Radius.sm} />
              <Skeleton width="60%" height={14} borderRadius={Radius.sm} />
              <Skeleton width="100%" height={60} borderRadius={Radius.sm} />
            </View>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Video Player */}
            {embedUrl ? (
              <View style={styles.playerWrap}>
                <WebView
                  source={{ uri: embedUrl }}
                  style={styles.player}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                />
              </View>
            ) : (
              <View style={styles.noVideo}>
                <Text style={styles.noVideoText}>Video unavailable</Text>
              </View>
            )}

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.title}>{video?.title}</Text>

              <View style={styles.metaRow}>
                {video?.channel_name && (
                  <Text style={styles.channel}>{video.channel_name}</Text>
                )}
                {video?.duration_minutes && (
                  <Text style={styles.duration}>{video.duration_minutes} min</Text>
                )}
              </View>

              <View style={styles.badges}>
                {video?.skill_level && (
                  <View style={[styles.badge, { backgroundColor: levelColor + '18' }]}>
                    <Text style={[styles.badgeText, { color: levelColor }]}>
                      {video.skill_level}
                    </Text>
                  </View>
                )}
                {video?.shot_type && (
                  <View style={[styles.badge, { backgroundColor: Colors.surface }]}>
                    <Text style={[styles.badgeText, { color: Colors.textDim }]}>
                      {video.shot_type}
                    </Text>
                  </View>
                )}
              </View>

              {video?.description && (
                <Text style={styles.description}>{video.description}</Text>
              )}

              {video?.tags && video.tags.length > 0 && (
                <View style={styles.tags}>
                  {video.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  loadingWrap: {
    flex: 1,
  },
  playerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  player: {
    flex: 1,
    backgroundColor: '#000',
  },
  noVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noVideoText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  info: {
    padding: Spacing[5],
    gap: Spacing[3],
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  channel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
  },
  duration: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  tag: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  tagText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
