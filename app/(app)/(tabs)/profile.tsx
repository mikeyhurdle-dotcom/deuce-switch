import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Fonts, Spacing, Alpha } from '../../../src/lib/constants';
import { getConnectionCount } from '../../../src/services/connection-service';
import { getPlayerSuggestions } from '../../../src/services/suggestion-service';
import { batchHeadToHead, type HeadToHeadRecord } from '../../../src/services/stats-service';
import type { PlayerSuggestion } from '../../../src/lib/types';

import {
  ProfileHeader,
  ProfileInsights,
  ProfileFeed,
  ProfileHistory,
  ProfileStats,
} from '../../../src/components/profile';
import type { RecentTournament, ProfileTab } from '../../../src/components/profile';

// ── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const { profile, user, signOut, refreshProfile } = useAuth();

  // Edit state
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [preferredPosition, setPreferredPosition] = useState<
    'left' | 'right' | 'both' | null
  >(profile?.preferred_position ?? null);
  const [racketBrand, setRacketBrand] = useState(profile?.racket_brand ?? '');
  const [racketModel, setRacketModel] = useState(profile?.racket_model ?? '');
  const [shoeBrand, setShoeBrand] = useState(profile?.shoe_brand ?? '');
  const [shoeModel, setShoeModel] = useState(profile?.shoe_model ?? '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>('Overview');

  // Extra profile data
  const [connectionCount, setConnectionCount] = useState(0);
  const [recentTournaments, setRecentTournaments] = useState<RecentTournament[]>(
    [],
  );
  const [tournamentCount, setTournamentCount] = useState(0);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [h2hMap, setH2hMap] = useState<Map<string, HeadToHeadRecord>>(new Map());
  const [loadingExtra, setLoadingExtra] = useState(true);

  // ── Data Fetching ──────────────────────────────────────────────────────

  const fetchExtraData = useCallback(async () => {
    if (!user) return;

    try {
      const [countResult, historyResult, pointsResult, suggestionsResult] =
        await Promise.all([
          getConnectionCount(user.id).catch(() => 0),
          supabase
            .from('tournament_players')
            .select(
              `
            tournament_id,
            tournaments (
              id, name, tournament_format, status, created_at
            )
          `,
            )
            .eq('player_id', user.id)
            .eq('tournament_status', 'active')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('player_match_results')
            .select('tournament_id')
            .eq('player_id', user.id)
            .not('tournament_id', 'is', null),
          getPlayerSuggestions(8).catch(() => [] as PlayerSuggestion[]),
        ]);

      setConnectionCount(countResult);
      setSuggestions(suggestionsResult);

      // Batch-compute h2h records for top partners
      if (suggestionsResult.length > 0) {
        const opponentIds = suggestionsResult.map((s) => s.user_id);
        batchHeadToHead(user.id, opponentIds)
          .then(setH2hMap)
          .catch(() => { /* non-critical */ });
      }

      if (!historyResult.error && historyResult.data) {
        const filtered = (historyResult.data as any[]).filter((r) => {
          // Supabase embedded join may return object or array — normalise
          const t = Array.isArray(r.tournaments) ? r.tournaments[0] : r.tournaments;
          if (t) r.tournaments = t;
          return !!t;
        });
        const tournamentIds = filtered.map((r) => r.tournament_id);

        // Batch-fetch player match results for points & rank calculation
        const { data: allResults } = tournamentIds.length > 0
          ? await supabase
              .from('player_match_results')
              .select('tournament_id, player_id, team_score')
              .in('tournament_id', tournamentIds)
          : { data: [] };

        // Build per-tournament leaderboard: { tournamentId -> { playerId -> totalPoints } }
        const tournamentScores = new Map<string, Map<string, number>>();
        for (const row of (allResults ?? []) as { tournament_id: string; player_id: string; team_score: number }[]) {
          if (!tournamentScores.has(row.tournament_id)) {
            tournamentScores.set(row.tournament_id, new Map());
          }
          const playerMap = tournamentScores.get(row.tournament_id)!;
          playerMap.set(row.player_id, (playerMap.get(row.player_id) ?? 0) + (row.team_score ?? 0));
        }

        const items: RecentTournament[] = await Promise.all(
          filtered.map(async (r) => {
            const { count } = await supabase
              .from('tournament_players')
              .select('id', { count: 'exact', head: true })
              .eq('tournament_id', r.tournament_id)
              .eq('tournament_status', 'active');

            // Calculate points and rank for this user in this tournament
            const playerMap = tournamentScores.get(r.tournament_id);
            const myPoints = playerMap?.get(user!.id) ?? 0;
            let rank: number | undefined;
            if (playerMap && playerMap.size > 0) {
              const sorted = Array.from(playerMap.entries()).sort((a, b) => b[1] - a[1]);
              const idx = sorted.findIndex(([pid]) => pid === user!.id);
              if (idx !== -1) rank = idx + 1;
            }

            return {
              tournament_id: r.tournament_id,
              name: r.tournaments.name,
              format: r.tournaments.tournament_format,
              status: r.tournaments.status,
              date: r.tournaments.created_at,
              playerCount: count ?? 0,
              totalPoints: myPoints,
              rank,
            };
          }),
        );
        setRecentTournaments(items);
      }

      if (!pointsResult.error && pointsResult.data) {
        const uniqueTournaments = new Set(
          (pointsResult.data as any[]).map((r) => r.tournament_id).filter(Boolean),
        );
        setTournamentCount(uniqueTournaments.size);
      }
    } catch {
      // Non-critical — profile still renders
    } finally {
      setLoadingExtra(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExtraData();
  }, [fetchExtraData]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), fetchExtraData()]);
    setRefreshing(false);
  }, [refreshProfile, fetchExtraData]);

  const handleEdit = () => {
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
    setPreferredPosition(profile?.preferred_position ?? null);
    setRacketBrand(profile?.racket_brand ?? '');
    setRacketModel(profile?.racket_model ?? '');
    setShoeBrand(profile?.shoe_brand ?? '');
    setShoeModel(profile?.shoe_model ?? '');
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          preferred_position: preferredPosition,
          racket_brand: racketBrand.trim() || null,
          racket_model: racketModel.trim() || null,
          shoe_brand: shoeBrand.trim() || null,
          shoe_model: shoeModel.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleTournamentPress = (t: RecentTournament) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (t.status === 'completed') {
      router.push(`/(app)/tournament/${t.tournament_id}/results`);
    } else if (t.status === 'running') {
      router.push(`/(app)/tournament/${t.tournament_id}/play`);
    } else {
      router.push(`/(app)/tournament/${t.tournament_id}/lobby`);
    }
  };

  const handleSuggestionConnected = (userId: string) => {
    setTimeout(() => {
      setSuggestions((prev) => prev.filter((s) => s.user_id !== userId));
      setConnectionCount((prev) => prev + 1);
    }, 1500);
  };

  const handleInvite = (opponentId: string, opponentName: string) => {
    router.push(`/(app)/invite?opponentId=${opponentId}&opponentName=${encodeURIComponent(opponentName)}`);
  };

  const handleGenericInvite = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { default: Sharing } = await import('expo-sharing');
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Sharing', 'Sharing is not available on this device.');
      return;
    }
    const { default: ClipboardModule } = await import('expo-clipboard');
    await ClipboardModule.setStringAsync('https://playsmashd.com');
    Alert.alert('Link Copied!', 'Download link copied to clipboard. Share it with your padel partners!');
  };

  // ── Derived Values ─────────────────────────────────────────────────────

  const winRate =
    profile?.matches_played && profile.matches_played > 0
      ? Math.round(
          ((profile.matches_won ?? 0) / profile.matches_played) * 100,
        )
      : null;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView testID="screen-profile" style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.opticYellow}
            />
          }
        >
          <ProfileHeader
            profile={profile}
            user={user}
            editing={editing}
            setEditing={(v) => {
              if (v) handleEdit();
              else setEditing(false);
            }}
            refreshProfile={refreshProfile}
            winRate={winRate}
            tournamentCount={tournamentCount}
            recentTournamentCount={recentTournaments.length}
            connectionCount={connectionCount}
            displayName={displayName}
            setDisplayName={setDisplayName}
            bio={bio}
            setBio={setBio}
            preferredPosition={preferredPosition}
            setPreferredPosition={setPreferredPosition}
            racketBrand={racketBrand}
            setRacketBrand={setRacketBrand}
            racketModel={racketModel}
            setRacketModel={setRacketModel}
            shoeBrand={shoeBrand}
            setShoeBrand={setShoeBrand}
            shoeModel={shoeModel}
            setShoeModel={setShoeModel}
            saving={saving}
            onSave={handleSave}
            onCancel={handleCancel}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* ── Overview Tab ──────────────────────────────────────────── */}
          {!editing && activeTab === 'Overview' && (
            <Animated.View
              key="overview"
              entering={FadeIn.duration(200)}
              style={styles.tabContent}
            >
              <ProfileInsights
                profile={profile}
                suggestions={suggestions}
                h2hMap={h2hMap}
                recentTournaments={recentTournaments}
                onSuggestionConnected={handleSuggestionConnected}
                onInvite={handleInvite}
                onGenericInvite={handleGenericInvite}
                onTournamentPress={handleTournamentPress}
              />
            </Animated.View>
          )}

          {/* ── Stats Tab ─────────────────────────────────────────────── */}
          {!editing && activeTab === 'Stats' && (
            <Animated.View
              key="stats"
              entering={FadeIn.duration(200)}
              style={styles.tabContent}
            >
              <ProfileStats />
            </Animated.View>
          )}

          {/* ── Feed Tab ──────────────────────────────────────────────── */}
          {!editing && activeTab === 'Feed' && (
            <Animated.View
              key="feed"
              entering={FadeIn.duration(200)}
              style={styles.tabContent}
            >
              <ProfileFeed tournaments={recentTournaments} />
            </Animated.View>
          )}

          {/* ── History Tab ───────────────────────────────────────────── */}
          {!editing && activeTab === 'History' && (
            <Animated.View
              key="history"
              entering={FadeIn.duration(200)}
              style={styles.tabContent}
            >
              <ProfileHistory tournaments={recentTournaments} />
            </Animated.View>
          )}

          {/* ── Import Match History ────────────────────────────────── */}
          {!editing && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(app)/import-matches');
              }}
              style={styles.importMatchesBtn}
            >
              <View style={styles.importMatchesIconWrap}>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.opticYellow} />
              </View>
              <View style={styles.importMatchesContent}>
                <Text style={styles.importMatchesTitle}>Import Match History</Text>
                <Text style={styles.importMatchesDesc}>
                  Screenshot your results from Nettla, Playtomic, or other apps
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
            </Pressable>
          )}

          {/* ── Sign Out ──────────────────────────────────────────────── */}
          {!editing && (
            <Pressable
              testID="btn-sign-out"
              onPress={handleSignOut}
              style={styles.signOutBtn}
              hitSlop={8}
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color={Colors.textMuted}
              />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── FAB ───────────────────────────────────────────────────── */}
      {!editing && (
        <Pressable
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(app)/tournament/create' as any);
          }}
        >
          <Ionicons name="add" size={28} color={Colors.darkBg} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  scrollContent: {
    paddingBottom: Spacing[10],
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.opticYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 10,
  },
  tabContent: {
    marginTop: Spacing[5],
  },

  // ── Import Matches ──
  importMatchesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Spacing[5],
    padding: Spacing[4],
    marginTop: Spacing[6],
    borderWidth: 1,
    borderColor: Alpha.yellow15,
  },
  importMatchesIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Alpha.yellow10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importMatchesContent: {
    flex: 1,
    gap: 2,
  },
  importMatchesTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  importMatchesDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 16,
  },

  // ── Sign Out ──
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing[8],
  },
  signOutText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
