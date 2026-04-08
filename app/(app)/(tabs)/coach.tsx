import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Radius, Spacing } from '../../../src/lib/constants';
import { Skeleton } from '../../../src/components/ui/Skeleton';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { FilterChips } from '../../../src/components/coach/FilterChips';
import { VideoCard } from '../../../src/components/coach/VideoCard';
import {
  fetchFeaturedVideos,
  fetchVideos,
} from '../../../src/services/training-service';
import type { TrainingVideo } from '../../../src/lib/types';
import { useAuth } from '../../../src/providers/AuthProvider';

export default function CoachScreen() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [featured, setFeatured] = useState<TrainingVideo[]>([]);
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shotType, setShotType] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [featuredResult, videosResult] = await Promise.allSettled([
        fetchFeaturedVideos(),
        fetchVideos({
          shot_type: shotType ?? undefined,
          skill_level: skillLevel ?? undefined,
        }),
      ]);
      if (featuredResult.status === 'fulfilled') setFeatured(featuredResult.value);
      if (videosResult.status === 'fulfilled') setVideos(videosResult.value);
    } catch {
      // Silently fail — user can pull to refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shotType, skillLevel]);

  // PLA-471: Wait for AuthProvider to settle before firing any fetches.
  // training_videos is public-read so this isn't strictly required, but
  // gating consistently across all tabs eliminates the cold-start race
  // perception even on otherwise auth-independent screens.
  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    loadData();
  }, [authLoading, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleVideoPress = (video: TrainingVideo) => {
    router.push(`/(app)/video/${video.id}` as any);
  };

  const renderVideoItem = ({ item, index }: { item: TrainingVideo; index: number }) => {
    // Pair items for 2-column grid
    if (index % 2 !== 0) return null;
    const next = videos[index + 1];
    return (
      <View style={styles.gridRow}>
        <VideoCard video={item} onPress={handleVideoPress} />
        {next ? (
          <VideoCard video={next} onPress={handleVideoPress} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView testID="screen-coach" style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Coach</Text>
        <Text style={styles.headerSubtitle}>Curated training from our launch partners — more coaches coming soon.</Text>
      </View>

      {/* Filters */}
      <FilterChips
        shotType={shotType}
        skillLevel={skillLevel}
        onShotTypeChange={setShotType}
        onSkillLevelChange={setSkillLevel}
      />

      {loading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton width="100%" height={160} borderRadius={Radius.lg} />
          <View style={styles.gridRow}>
            <Skeleton width="48%" height={140} borderRadius={Radius.md} />
            <Skeleton width="48%" height={140} borderRadius={Radius.md} />
          </View>
          <View style={styles.gridRow}>
            <Skeleton width="48%" height={140} borderRadius={Radius.md} />
            <Skeleton width="48%" height={140} borderRadius={Radius.md} />
          </View>
        </View>
      ) : videos.length === 0 ? (
        <EmptyState
          icon="videocam-outline"
          iconColor={Colors.aquaGreen}
          title="No videos match these filters"
          subtitle="Clear your filters to see all curated content, or check back soon — we're adding more coaches."
        />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={renderVideoItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.opticYellow}
            />
          }
          ListHeaderComponent={
            featured.length > 0 ? (
              <View style={styles.featuredSection}>
                <Text style={styles.sectionTitle}>Featured</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredScroll}
                >
                  {featured.map((v) => (
                    <VideoCard key={v.id} video={v} onPress={handleVideoPress} size="large" />
                  ))}
                </ScrollView>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
    marginTop: Spacing[1],
  },
  skeletonWrap: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[10],
    gap: Spacing[3],
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  featuredSection: {
    marginBottom: Spacing[4],
    gap: Spacing[2],
  },
  featuredScroll: {
    paddingRight: Spacing[4],
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.textPrimary,
  },
});
