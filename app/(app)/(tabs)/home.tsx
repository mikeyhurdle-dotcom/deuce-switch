import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Fonts, AppConfig } from '../../../src/lib/constants';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { SmashdLogo } from '../../../src/components/ui/SmashdLogo';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.3 };

function useSpringPress() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => { scale.value = withSpring(0.97, SPRING_CONFIG); };
  const onPressOut = () => { scale.value = withSpring(1, SPRING_CONFIG); };
  return { animatedStyle, onPressIn, onPressOut };
}

type ActiveTournament = {
  tournament_id: string;
  tournament: {
    id: string;
    name: string;
    status: 'draft' | 'running' | 'completed';
    current_round: number | null;
  };
};

export default function Home() {
  const { profile, user, refreshProfile } = useAuth();
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null);
  const [loadingActive, setLoadingActive] = useState(true);

  const fetchActive = useCallback(async () => {
    if (!user) { setLoadingActive(false); return; }
    setLoadingActive(true);
    try {
      const { data } = await supabase
        .from('tournament_players')
        .select(`
          tournament_id,
          tournaments (
            id,
            name,
            status,
            current_round
          )
        `)
        .eq('profile_id', user.id)
        .in('tournaments.status', ['draft', 'running'])
        .order('created_at', { ascending: false })
        .limit(1);

      const raw = (data ?? []) as any[];
      const active = raw.find((r) => r.tournaments);
      setActiveTournament(active ?? null);
    } catch {
      // Fail silently
    } finally {
      setLoadingActive(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActive();
    // Refresh profile stats so Quick Stats card shows latest matches_played / matches_won
    refreshProfile();
  }, [fetchActive]);

  const bannerSpring = useSpringPress();
  const createSpring = useSpringPress();
  const joinSpring = useSpringPress();

  const greeting = profile?.display_name
    ? `Hey, ${profile.display_name}`
    : 'Welcome back';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <SmashdLogo size={40} />
            <Text style={styles.logo}>{AppConfig.name}</Text>
          </View>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {/* Active Tournament Banner */}
        {loadingActive && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={Colors.opticYellow} />
            <Text style={styles.loadingBannerText}>Checking active tournaments…</Text>
          </View>
        )}
        {!loadingActive && activeTournament && (
          <AnimatedPressable
            style={[styles.activeBanner, bannerSpring.animatedStyle]}
            onPressIn={bannerSpring.onPressIn}
            onPressOut={bannerSpring.onPressOut}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const tid = activeTournament.tournament.id;
              const status = activeTournament.tournament.status;
              if (status === 'running') {
                router.push(`/(app)/tournament/${tid}/play`);
              } else {
                router.push(`/(app)/tournament/${tid}/lobby`);
              }
            }}
          >
            <View style={styles.activeBannerContent}>
              <View style={styles.activeBannerLeft}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBannerTitle} numberOfLines={1}>
                  {activeTournament.tournament.name}
                </Text>
              </View>
              <Badge
                label={activeTournament.tournament.status === 'running' ? 'LIVE' : 'LOBBY'}
                variant={activeTournament.tournament.status === 'running' ? 'info' : 'default'}
              />
            </View>
            {activeTournament.tournament.status === 'running' && (
              <Text style={styles.activeBannerSub}>
                Round {activeTournament.tournament.current_round ?? 1} — tap to continue
              </Text>
            )}
            {activeTournament.tournament.status === 'draft' && (
              <Text style={styles.activeBannerSub}>
                Waiting in lobby — tap to rejoin
              </Text>
            )}
          </AnimatedPressable>
        )}

        {/* Primary CTAs */}
        <View style={styles.actions}>
          <AnimatedPressable
            style={[styles.ctaCard, styles.ctaCreate, createSpring.animatedStyle]}
            onPressIn={createSpring.onPressIn}
            onPressOut={createSpring.onPressOut}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(app)/tournament/create');
            }}
          >
            <Text style={styles.ctaEmoji}>🏆</Text>
            <Text style={styles.ctaTitle}>CREATE TOURNAMENT</Text>
            <Text style={styles.ctaDesc}>
              Set up an Americano and invite players
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.ctaCard, styles.ctaJoin, joinSpring.animatedStyle]}
            onPressIn={joinSpring.onPressIn}
            onPressOut={joinSpring.onPressOut}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(app)/join');
            }}
          >
            <Text style={styles.ctaEmoji}>🎾</Text>
            <Text style={styles.ctaTitle}>JOIN TOURNAMENT</Text>
            <Text style={styles.ctaDesc}>
              Enter a code or scan QR to join
            </Text>
          </AnimatedPressable>
        </View>

        {/* Quick Stats */}
        {profile && (
          <Card>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.matches_played ?? 0}</Text>
                <Text style={styles.statLabel}>MATCHES</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.matches_won ?? 0}</Text>
                <Text style={styles.statLabel}>WINS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {profile.matches_played
                    ? `${Math.round((profile.matches_won / profile.matches_played) * 100)}%`
                    : '—'}
                </Text>
                <Text style={styles.statLabel}>WIN RATE</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 24,
  },
  header: {
    gap: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    fontFamily: Fonts.mono,
    fontSize: 32,
    color: Colors.opticYellow,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  greeting: {
    fontFamily: Fonts.body,
    fontSize: 18,
    color: Colors.textDim,
  },
  actions: {
    gap: 16,
  },
  ctaCard: {
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  ctaCreate: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.opticYellow,
  },
  ctaJoin: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaEmoji: {
    fontSize: 32,
  },
  ctaTitle: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  ctaDesc: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.mono,
    fontSize: 28,
    color: Colors.opticYellow,
  },
  statLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingBannerText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
  },
  activeBanner: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.aquaGreen,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  activeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.aquaGreen,
  },
  activeBannerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  activeBannerSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
    marginLeft: 18,
  },
});
