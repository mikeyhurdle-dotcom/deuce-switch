import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Fonts, Radius } from '../../../src/lib/constants';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Input } from '../../../src/components/ui/Input';
import { getConnectionCount } from '../../../src/services/connection-service';
import { getPlayerSuggestions } from '../../../src/services/suggestion-service';
import { PlayerSuggestionCard } from '../../../src/components/PlayerSuggestionCard';
import type { TournamentFormat, PlayerMatchResult, PlayerSuggestion } from '../../../src/lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type RecentTournament = {
  tournament_id: string;
  name: string;
  format: TournamentFormat;
  status: 'draft' | 'running' | 'completed';
  date: string;
  playerCount: number;
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Profile() {
  const { profile, user, signOut, refreshProfile } = useAuth();

  // Edit state
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [preferredPosition, setPreferredPosition] = useState<
    'left' | 'right' | 'both' | null
  >(profile?.preferred_position ?? null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Extra profile data
  const [connectionCount, setConnectionCount] = useState(0);
  const [recentTournaments, setRecentTournaments] = useState<RecentTournament[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchExtraData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch connections count, recent tournaments, total points, and suggestions in parallel
      const [countResult, historyResult, pointsResult, suggestionsResult] = await Promise.all([
        getConnectionCount(user.id).catch(() => 0),
        // Recent 5 tournaments
        supabase
          .from('tournament_players')
          .select(
            `
            tournament_id,
            tournaments (
              id,
              name,
              tournament_format,
              status,
              created_at
            )
          `,
          )
          .eq('player_id', user.id)
          .eq('tournament_status', 'active')
          .order('created_at', { ascending: false })
          .limit(5),
        // Total points from player_match_results
        supabase
          .from('player_match_results')
          .select('team_score')
          .eq('player_id', user.id),
        // People you've played with
        getPlayerSuggestions(8).catch(() => [] as PlayerSuggestion[]),
      ]);

      setConnectionCount(countResult);
      setSuggestions(suggestionsResult);

      // Process tournament history
      if (!historyResult.error && historyResult.data) {
        const items: RecentTournament[] = await Promise.all(
          (historyResult.data as any[])
            .filter((r) => r.tournaments)
            .map(async (r) => {
              const { count } = await supabase
                .from('tournament_players')
                .select('id', { count: 'exact', head: true })
                .eq('tournament_id', r.tournament_id)
                .eq('tournament_status', 'active');

              return {
                tournament_id: r.tournament_id,
                name: r.tournaments.name,
                format: r.tournaments.tournament_format,
                status: r.tournaments.status,
                date: r.tournaments.created_at,
                playerCount: count ?? 0,
              };
            }),
        );
        setRecentTournaments(items);
      }

      // Sum total points
      if (!pointsResult.error && pointsResult.data) {
        const sum = (pointsResult.data as any[]).reduce(
          (acc, r) => acc + (r.team_score ?? 0),
          0,
        );
        setTotalPoints(sum);
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

  // ─── Handlers ───────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), fetchExtraData()]);
    setRefreshing(false);
  }, [refreshProfile, fetchExtraData]);

  const handleEdit = () => {
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
    setPreferredPosition(profile?.preferred_position ?? null);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

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
    // Remove the connected player from suggestions after a short delay for UX
    setTimeout(() => {
      setSuggestions((prev) => prev.filter((s) => s.user_id !== userId));
      setConnectionCount((prev) => prev + 1);
    }, 1500);
  };

  // ─── Derived Values ─────────────────────────────────────────────────────

  const winRate =
    profile?.matches_played && profile.matches_played > 0
      ? Math.round(((profile.matches_won ?? 0) / profile.matches_played) * 100)
      : null;

  const initials = (profile?.display_name ?? user?.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasAvatar = !!profile?.game_face_url;

  // ─── Helpers ────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatLabel = (format: TournamentFormat) => {
    const labels: Record<TournamentFormat, string> = {
      americano: 'Americano',
      mexicano: 'Mexicano',
      team_americano: 'Team',
      mixicano: 'Mixicano',
    };
    return labels[format] ?? format;
  };

  const statusVariant = (
    status: string,
  ): 'success' | 'info' | 'default' | 'warning' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.opticYellow}
            />
          }
        >
          <Text style={styles.title}>PROFILE</Text>

          {/* ─── Player Identity Card ──────────────────────────────────── */}
          <Card variant="highlighted">
            <View style={styles.playerCard}>
              {/* Avatar */}
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

              {editing ? (
                <View style={styles.editForm}>
                  <Input
                    label="DISPLAY NAME"
                    placeholder="Your name"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                  <Input
                    label="BIO"
                    placeholder="Tell us about your game..."
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.positionSection}>
                    <Text style={styles.positionLabel}>PREFERRED SIDE</Text>
                    <View style={styles.positionRow}>
                      {(['left', 'right', 'both'] as const).map((pos) => (
                        <Pressable
                          key={pos}
                          style={[
                            styles.positionChip,
                            preferredPosition === pos &&
                              styles.positionChipActive,
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPreferredPosition(pos);
                          }}
                        >
                          <Text
                            style={[
                              styles.positionChipText,
                              preferredPosition === pos &&
                                styles.positionChipTextActive,
                            ]}
                          >
                            {pos.toUpperCase()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={styles.editActions}>
                    <Button
                      title="CANCEL"
                      onPress={handleCancel}
                      variant="outline"
                      size="md"
                    />
                    <Button
                      title="SAVE"
                      onPress={handleSave}
                      loading={saving}
                      variant="primary"
                      size="md"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.identityInfo}>
                  <Text style={styles.displayName}>
                    {profile?.display_name ??
                      user?.email?.split('@')[0] ??
                      'Player'}
                  </Text>
                  {profile?.bio && (
                    <Text style={styles.bio} numberOfLines={2}>
                      {profile.bio}
                    </Text>
                  )}
                  {profile?.username && (
                    <Text style={styles.username}>@{profile.username}</Text>
                  )}
                  <Button
                    title="EDIT PROFILE"
                    onPress={handleEdit}
                    variant="ghost"
                    size="sm"
                  />
                </View>
              )}
            </View>
          </Card>

          {/* ─── Stats Grid (4 across) ─────────────────────────────────── */}
          {!editing && (
            <View style={styles.statsRow}>
              <StatBox
                value={profile?.matches_played ?? 0}
                label="PLAYED"
                color={Colors.textPrimary}
              />
              <StatBox
                value={profile?.matches_won ?? 0}
                label="WINS"
                color={Colors.opticYellow}
              />
              <StatBox
                value={winRate !== null ? `${winRate}%` : '—'}
                label="WIN %"
                color={Colors.aquaGreen}
              />
              <StatBox
                value={totalPoints}
                label="POINTS"
                color={Colors.coral}
              />
            </View>
          )}

          {/* ─── Connections Count ──────────────────────────────────────── */}
          {!editing && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(app)/connections');
              }}
            >
              <Card>
                <View style={styles.connectionsRow}>
                  <View style={styles.connectionsInfo}>
                    <Text style={styles.connectionsCount}>
                      {connectionCount}
                    </Text>
                    <Text style={styles.connectionsLabel}>
                      CONNECTION{connectionCount !== 1 ? 'S' : ''}
                    </Text>
                  </View>
                  <View style={styles.connectionsRight}>
                    <Text style={styles.connectionsHint}>
                      Play together, connect after
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.textMuted}
                      style={{ marginTop: 2 }}
                    />
                  </View>
                </View>
              </Card>
            </Pressable>
          )}

          {/* ─── People You've Played With ─────────────────────────────── */}
          {!editing && suggestions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PLAYED WITH</Text>
                <Text style={styles.sectionSubtitle}>
                  {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.user_id}
                renderItem={({ item }) => (
                  <PlayerSuggestionCard
                    suggestion={item}
                    onConnected={handleSuggestionConnected}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              />
            </View>
          )}

          {/* ─── Recent Tournaments ────────────────────────────────────── */}
          {!editing && recentTournaments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RECENT</Text>
                <Pressable
                  onPress={() => router.push('/(app)/(tabs)/history')}
                  hitSlop={8}
                >
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              </View>
              {recentTournaments.map((t) => (
                <Pressable
                  key={t.tournament_id}
                  onPress={() => handleTournamentPress(t)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Card>
                    <View style={styles.tournamentRow}>
                      <View style={styles.tournamentInfo}>
                        <Text style={styles.tournamentName} numberOfLines={1}>
                          {t.name}
                        </Text>
                        <View style={styles.tournamentMeta}>
                          <Text style={styles.metaText}>
                            {formatLabel(t.format)}
                          </Text>
                          <Text style={styles.metaDot}>·</Text>
                          <Text style={styles.metaText}>
                            {t.playerCount} players
                          </Text>
                          <Text style={styles.metaDot}>·</Text>
                          <Text style={styles.metaText}>
                            {formatDate(t.date)}
                          </Text>
                        </View>
                      </View>
                      <Badge
                        label={t.status.toUpperCase()}
                        variant={statusVariant(t.status)}
                      />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}

          {/* ─── Sign Out ──────────────────────────────────────────────── */}
          {!editing && (
            <View style={styles.actions}>
              <Button
                title="SIGN OUT"
                onPress={handleSignOut}
                variant="outline"
                size="lg"
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Stat Box Component ───────────────────────────────────────────────────

function StatBox({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
    gap: 16,
  },
  title: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: 3,
  },

  // ── Player Card ──
  playerCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.opticYellow,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: Colors.opticYellow,
  },
  avatarText: {
    fontFamily: Fonts.mono,
    fontSize: 30,
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
  identityInfo: {
    alignItems: 'center',
    gap: 4,
  },
  displayName: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  bio: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  username: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.opticYellow,
    marginBottom: 4,
  },

  // ── Edit Form ──
  editForm: {
    width: '100%',
    gap: 16,
    paddingTop: 8,
  },
  positionSection: {
    gap: 8,
  },
  positionLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  positionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  positionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  positionChipActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
  },
  positionChipText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
  positionChipTextActive: {
    color: Colors.opticYellow,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },

  // ── Stats Row (4-across) ──
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

  // ── Connections ──
  connectionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  connectionsInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  connectionsCount: {
    fontFamily: Fonts.mono,
    fontSize: 28,
    color: Colors.violet,
  },
  connectionsLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  connectionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionsHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // ── Recent Tournaments ──
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
    letterSpacing: 2,
  },
  seeAll: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.opticYellow,
  },
  sectionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  suggestionsScroll: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tournamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 2,
  },
  tournamentInfo: {
    flex: 1,
    gap: 4,
  },
  tournamentName: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  tournamentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  metaDot: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Actions ──
  actions: {
    marginTop: 'auto',
    paddingTop: 12,
  },
});
