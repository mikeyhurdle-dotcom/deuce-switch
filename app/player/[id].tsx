/**
 * Public Player Profile — /player/[id]
 *
 * Universal-link destination for playsmashd.com/player/[id]. This route
 * lives OUTSIDE the (app) auth guard so it works for anyone tapping a
 * shared profile link — whether they have the app or not.
 *
 * If the viewer is authenticated AND it's their own profile, we show
 * a button to jump to the full in-app profile. Otherwise we show a
 * read-only public view with a CTA to download/sign in.
 *
 * "The most important step a man can take is the next one."
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/AuthProvider';
import { Colors, Fonts, Radius } from '../../src/lib/constants';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';

// ─── Types ──────────────────────────────────────────────────────────────────

type PublicProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  game_face_url: string | null;
  bio: string | null;
  location: string | null;
  preferred_position: 'left' | 'right' | 'both' | null;
  matches_played: number;
  matches_won: number;
  visibility: 'public' | 'private';
};

type PlayerState = 'loading' | 'found' | 'private' | 'not_found' | 'error';

// ─── Component ──────────────────────────────────────────────────────────────

export default function PlayerProfile() {
  const { id: playerId } = useLocalSearchParams<{ id: string }>();
  const { session, user } = useAuth();
  const isAuthenticated = !!session;
  const isOwnProfile = user?.id === playerId;

  const [state, setState] = useState<PlayerState>('loading');
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);

  // ── Fetch profile ──
  const fetchProfile = useCallback(async () => {
    if (!playerId) {
      setState('not_found');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, display_name, username, game_face_url, bio, location, preferred_position, matches_played, matches_won, visibility',
        )
        .eq('id', playerId)
        .single();

      if (error || !data) {
        setState('not_found');
        return;
      }

      // Respect visibility — unless it's the user's own profile
      if (data.visibility === 'private' && !isOwnProfile) {
        setState('private');
        return;
      }

      setProfile(data as PublicProfile);

      // Fetch total points
      const { data: pointsData } = await supabase
        .from('player_match_results')
        .select('team_score')
        .eq('player_id', playerId);

      if (pointsData) {
        const sum = pointsData.reduce(
          (acc, r) => acc + ((r as any).team_score ?? 0),
          0,
        );
        setTotalPoints(sum);
      }

      setState('found');
    } catch {
      setState('error');
    }
  }, [playerId, isOwnProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Derived values ──
  const winRate =
    profile?.matches_played && profile.matches_played > 0
      ? Math.round((profile.matches_won / profile.matches_played) * 100)
      : null;

  const initials = (profile?.display_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasAvatar = !!profile?.game_face_url;

  // ── Render states ──

  if (state === 'loading') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.opticYellow} />
            <Text style={styles.loadingText}>Loading player…</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (state === 'not_found') {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'Player' }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Card>
              <View style={styles.emptyContent}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>Player Not Found</Text>
                <Text style={styles.emptyMessage}>
                  This player profile doesn't exist or may have been removed.
                </Text>
                <Button
                  title="GO BACK"
                  onPress={() => router.back()}
                  variant="outline"
                  size="md"
                />
              </View>
            </Card>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (state === 'private') {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'Player' }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Card>
              <View style={styles.emptyContent}>
                <Text style={styles.emptyEmoji}>🔒</Text>
                <Text style={styles.emptyTitle}>Private Profile</Text>
                <Text style={styles.emptyMessage}>
                  This player has set their profile to private.
                </Text>
                <Button
                  title="GO BACK"
                  onPress={() => router.back()}
                  variant="outline"
                  size="md"
                />
              </View>
            </Card>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (state === 'error') {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'Player' }} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Card>
              <View style={styles.emptyContent}>
                <Text style={styles.emptyEmoji}>😕</Text>
                <Text style={styles.emptyTitle}>Something Went Wrong</Text>
                <Text style={styles.emptyMessage}>
                  Could not load this profile. Please try again.
                </Text>
                <Button
                  title="RETRY"
                  onPress={fetchProfile}
                  variant="primary"
                  size="md"
                />
              </View>
            </Card>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // ── Main profile view ──
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: profile?.display_name ?? 'Player',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontFamily: Fonts.mono,
            fontSize: 16,
            letterSpacing: 2,
          } as any,
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* ─── Avatar + Name ────────────────────────────────────────────── */}
          <Card variant="highlighted">
            <View style={styles.playerCard}>
              <View style={styles.avatarContainer}>
                {hasAvatar ? (
                  <Image
                    source={{ uri: profile!.game_face_url! }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                {profile?.preferred_position && (
                  <View style={styles.positionBadge}>
                    <Text style={styles.positionBadgeText}>
                      {profile.preferred_position.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.displayName}>
                {profile?.display_name ?? 'Player'}
              </Text>

              {profile?.username && (
                <Text style={styles.username}>@{profile.username}</Text>
              )}

              {profile?.bio && (
                <Text style={styles.bio} numberOfLines={3}>
                  {profile.bio}
                </Text>
              )}

              {profile?.location && (
                <Text style={styles.location}>📍 {profile.location}</Text>
              )}
            </View>
          </Card>

          {/* ─── Stats Grid ───────────────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.textPrimary }]}>
                {profile?.matches_played ?? 0}
              </Text>
              <Text style={styles.statLabel}>PLAYED</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.opticYellow }]}>
                {profile?.matches_won ?? 0}
              </Text>
              <Text style={styles.statLabel}>WINS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.aquaGreen }]}>
                {winRate !== null ? `${winRate}%` : '—'}
              </Text>
              <Text style={styles.statLabel}>WIN %</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.coral }]}>
                {totalPoints}
              </Text>
              <Text style={styles.statLabel}>POINTS</Text>
            </View>
          </View>

          {/* ─── Actions ──────────────────────────────────────────────────── */}
          <View style={styles.actions}>
            {isOwnProfile ? (
              // Own profile — jump to full in-app profile
              <Button
                title="GO TO MY PROFILE"
                onPress={() => router.replace('/(app)/(tabs)/profile')}
                variant="primary"
                size="lg"
              />
            ) : isAuthenticated ? (
              // Authenticated viewer — connect / go home
              <>
                <Button
                  title="BACK TO HOME"
                  onPress={() => router.replace('/(app)/(tabs)/home')}
                  variant="primary"
                  size="lg"
                />
              </>
            ) : (
              // Guest — sign up CTA
              <>
                <Button
                  title="JOIN SMASHD"
                  onPress={() => router.push('/(auth)/sign-up')}
                  variant="primary"
                  size="lg"
                />
                <Button
                  title="SIGN IN"
                  onPress={() => router.push('/(auth)/sign-in')}
                  variant="outline"
                  size="lg"
                />
              </>
            )}
          </View>

          {/* ─── Footer Branding ──────────────────────────────────────────── */}
          {!isAuthenticated && (
            <View style={styles.footer}>
              <Text style={styles.footerBrand}>SMASHD</Text>
              <Text style={styles.footerTagline}>
                The Community Hub for Padel
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textDim,
    marginTop: 16,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },

  // ── Player Card ──
  playerCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.opticYellow,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: Colors.opticYellow,
  },
  avatarText: {
    fontFamily: Fonts.mono,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  positionBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  positionBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.aquaGreen,
    letterSpacing: 0.5,
  },
  displayName: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  username: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.opticYellow,
  },
  bio: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 22,
  },
  location: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.mono,
    fontSize: 22,
  },
  statLabel: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  // ── Actions ──
  actions: {
    gap: 12,
    marginTop: 8,
  },

  // ── Empty States ──
  emptyContent: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  emptyMessage: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 22,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerBrand: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.opticYellow,
    letterSpacing: 6,
  },
  footerTagline: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
