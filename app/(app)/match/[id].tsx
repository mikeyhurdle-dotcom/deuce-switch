import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/providers/AuthProvider';
import { supabase } from '../../../src/lib/supabase';
import {
  getMatchDetail,
  updateMatchResult,
  type MatchUpdate,
} from '../../../src/services/tournament-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../../src/lib/constants';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import type { Match, MatchConditions, CourtSide, MatchIntensity } from '../../../src/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

type PlayerInfo = {
  id: string;
  displayName: string;
};

type TournamentInfo = {
  name: string;
  tournament_format: string;
};

// ── Chip selector ────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; icon?: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <View style={styles.chipSection}>
      <Text style={styles.chipLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(selected ? null : opt.value);
              }}
            >
              {opt.icon && (
                <Ionicons
                  name={opt.icon as any}
                  size={14}
                  color={selected ? Colors.opticYellow : Colors.textMuted}
                />
              )}
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [playerMap, setPlayerMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editScoreA, setEditScoreA] = useState('');
  const [editScoreB, setEditScoreB] = useState('');
  const [editConditions, setEditConditions] = useState<MatchConditions | null>(null);
  const [editCourtSide, setEditCourtSide] = useState<CourtSide | null>(null);
  const [editIntensity, setEditIntensity] = useState<MatchIntensity | null>(null);

  // ── Data Fetching ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const m = await getMatchDetail(id);
      if (!m) {
        Alert.alert('Not Found', 'Match not found.');
        router.back();
        return;
      }
      setMatch(m);

      // Fetch tournament info
      const { data: t } = await supabase
        .from('tournaments')
        .select('name, tournament_format')
        .eq('id', m.tournament_id)
        .single();
      if (t) setTournament(t as TournamentInfo);

      // Fetch player names
      const ids = [m.player1_id, m.player2_id, m.player3_id, m.player4_id].filter(Boolean);
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ids);
        const map = new Map<string, string>();
        for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
          map.set(p.id, p.display_name ?? 'Player');
        }
        setPlayerMap(map);
      }
    } catch {
      Alert.alert('Error', 'Failed to load match details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Edit Handlers ────────────────────────────────────────────────────────

  const startEditing = () => {
    if (!match) return;
    setEditScoreA(match.team_a_score?.toString() ?? '');
    setEditScoreB(match.team_b_score?.toString() ?? '');
    setEditConditions(match.conditions);
    setEditCourtSide(match.court_side);
    setEditIntensity(match.intensity);
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const handleSave = async () => {
    if (!match) return;

    const scoreA = parseInt(editScoreA, 10);
    const scoreB = parseInt(editScoreB, 10);

    if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
      Alert.alert('Invalid Score', 'Scores must be non-negative numbers.');
      return;
    }

    setSaving(true);
    try {
      const updates: MatchUpdate = {
        team_a_score: scoreA,
        team_b_score: scoreB,
        conditions: editConditions,
        court_side: editCourtSide,
        intensity: editIntensity,
      };
      await updateMatchResult(match.id, updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
      await fetchData(); // Refresh
    } catch (e: any) {
      Alert.alert('Save Failed', e.message ?? 'Could not update match.');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived Values ───────────────────────────────────────────────────────

  const pName = (pid: string) => playerMap.get(pid) ?? 'Player';

  const isParticipant =
    user &&
    match &&
    [match.player1_id, match.player2_id, match.player3_id, match.player4_id].includes(user.id);

  const isOrganiser = user && match && tournament;

  const canEdit =
    match &&
    (match.status === 'reported' || match.status === 'approved') &&
    (isParticipant || isOrganiser);

  const userTeam =
    user && match
      ? [match.player1_id, match.player2_id].includes(user.id)
        ? 'a'
        : [match.player3_id, match.player4_id].includes(user.id)
          ? 'b'
          : null
      : null;

  const won =
    userTeam && match?.team_a_score != null && match?.team_b_score != null
      ? userTeam === 'a'
        ? match.team_a_score > match.team_b_score
        : match.team_b_score > match.team_a_score
      : null;

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView testID="screen-match-detail" style={styles.safe}>
        <Stack.Screen options={{ title: 'MATCH DETAIL', headerShown: true }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.opticYellow} />
        </View>
      </SafeAreaView>
    );
  }

  if (!match) return null;

  return (
    <SafeAreaView testID="screen-match-detail" style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'MATCH DETAIL',
          headerShown: true,
          headerRight: () =>
            canEdit && !editing ? (
              <Pressable
                testID="btn-edit-match"
                onPress={startEditing}
                hitSlop={8}
              >
                <Ionicons name="pencil" size={18} color={Colors.opticYellow} />
              </Pressable>
            ) : null,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tournament Context */}
        {tournament && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.tournamentBanner}>
            <Ionicons name="trophy-outline" size={16} color={Colors.opticYellow} />
            <View style={styles.tournamentInfo}>
              <Text style={styles.tournamentName}>{tournament.name}</Text>
              <Text style={styles.tournamentFormat}>
                {tournament.tournament_format.replace('_', ' ').toUpperCase()} · Round {match.round_number}
                {match.court_number ? ` · Court ${match.court_number}` : ''}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Score Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.scoreCard}>
          {won !== null && (
            <View style={[styles.resultBadge, won ? styles.resultWin : styles.resultLoss]}>
              <Text style={[styles.resultText, won ? styles.resultTextWin : styles.resultTextLoss]}>
                {won ? 'WIN' : 'LOSS'}
              </Text>
            </View>
          )}

          <View style={styles.teamsRow}>
            {/* Team A */}
            <View style={styles.team}>
              <Text style={[styles.teamLabel, userTeam === 'a' && styles.teamLabelHighlight]}>
                TEAM A {userTeam === 'a' ? '(YOU)' : ''}
              </Text>
              <Text style={styles.playerName} numberOfLines={1}>
                {pName(match.player1_id)}
              </Text>
              <Text style={styles.playerName} numberOfLines={1}>
                {pName(match.player2_id)}
              </Text>
            </View>

            {/* Score */}
            <View style={styles.scoreCenter}>
              {editing ? (
                <View style={styles.scoreEditRow}>
                  <Input
                    testID="input-score-a"
                    value={editScoreA}
                    onChangeText={setEditScoreA}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.scoreInput}
                  />
                  <Text style={styles.scoreDivider}>–</Text>
                  <Input
                    testID="input-score-b"
                    value={editScoreB}
                    onChangeText={setEditScoreB}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.scoreInput}
                  />
                </View>
              ) : (
                <View style={styles.scoreDisplay}>
                  <Text style={styles.scoreNum}>{match.team_a_score ?? '–'}</Text>
                  <Text style={styles.scoreSep}>:</Text>
                  <Text style={styles.scoreNum}>{match.team_b_score ?? '–'}</Text>
                </View>
              )}
              <Text style={styles.statusLabel}>{match.status.toUpperCase()}</Text>
            </View>

            {/* Team B */}
            <View style={[styles.team, styles.teamRight]}>
              <Text style={[styles.teamLabel, userTeam === 'b' && styles.teamLabelHighlight]}>
                TEAM B {userTeam === 'b' ? '(YOU)' : ''}
              </Text>
              <Text style={styles.playerName} numberOfLines={1}>
                {pName(match.player3_id)}
              </Text>
              <Text style={styles.playerName} numberOfLines={1}>
                {pName(match.player4_id)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Match Metadata */}
        {editing ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.metadataCard}>
            <Text style={styles.metadataTitle}>MATCH DETAILS</Text>

            <ChipRow
              label="CONDITIONS"
              value={editConditions}
              onChange={setEditConditions}
              options={[
                { value: 'indoor', label: 'Indoor', icon: 'home-outline' },
                { value: 'outdoor', label: 'Outdoor', icon: 'sunny-outline' },
              ]}
            />

            <ChipRow
              label="COURT SIDE"
              value={editCourtSide}
              onChange={setEditCourtSide}
              options={[
                { value: 'left', label: 'Left', icon: 'arrow-back-outline' },
                { value: 'right', label: 'Right', icon: 'arrow-forward-outline' },
                { value: 'both', label: 'Both', icon: 'swap-horizontal-outline' },
              ]}
            />

            <ChipRow
              label="INTENSITY"
              value={editIntensity}
              onChange={setEditIntensity}
              options={[
                { value: 'casual', label: 'Casual' },
                { value: 'competitive', label: 'Competitive' },
                { value: 'intense', label: 'Intense' },
              ]}
            />

            <View style={styles.editActions}>
              <Button
                title="CANCEL"
                onPress={cancelEditing}
                variant="outline"
                size="md"
              />
              <Button
                testID="btn-save-match"
                title="SAVE CHANGES"
                onPress={handleSave}
                loading={saving}
                variant="primary"
                size="md"
              />
            </View>
          </Animated.View>
        ) : (
          (match.conditions || match.court_side || match.intensity) && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.metadataCard}>
              <Text style={styles.metadataTitle}>MATCH DETAILS</Text>
              <View style={styles.metadataGrid}>
                {match.conditions && (
                  <MetadataItem
                    icon={match.conditions === 'indoor' ? 'home-outline' : 'sunny-outline'}
                    label="CONDITIONS"
                    value={match.conditions.charAt(0).toUpperCase() + match.conditions.slice(1)}
                  />
                )}
                {match.court_side && (
                  <MetadataItem
                    icon="swap-horizontal-outline"
                    label="COURT SIDE"
                    value={match.court_side.charAt(0).toUpperCase() + match.court_side.slice(1)}
                  />
                )}
                {match.intensity && (
                  <MetadataItem
                    icon="flame-outline"
                    label="INTENSITY"
                    value={match.intensity.charAt(0).toUpperCase() + match.intensity.slice(1)}
                  />
                )}
              </View>
            </Animated.View>
          )
        )}

        {/* Timestamps */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.timestampCard}>
          {match.actual_start_time && (
            <TimestampRow label="Started" value={fmtDateTime(match.actual_start_time)} />
          )}
          {match.actual_end_time && (
            <TimestampRow label="Ended" value={fmtDateTime(match.actual_end_time)} />
          )}
          <TimestampRow label="Created" value={fmtDateTime(match.created_at)} />
          {match.updated_at !== match.created_at && (
            <TimestampRow label="Updated" value={fmtDateTime(match.updated_at)} />
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MetadataItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon as any} size={18} color={Colors.aquaGreen} />
      <View>
        <Text style={styles.metaItemLabel}>{label}</Text>
        <Text style={styles.metaItemValue}>{value}</Text>
      </View>
    </View>
  );
}

function TimestampRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.timestampRow}>
      <Text style={styles.timestampLabel}>{label}</Text>
      <Text style={styles.timestampValue}>{value}</Text>
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing[5],
    gap: Spacing[4],
    paddingBottom: Spacing[10],
  },

  // Tournament banner
  tournamentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Alpha.yellow15,
  },
  tournamentInfo: {
    flex: 1,
    gap: 2,
  },
  tournamentName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  tournamentFormat: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },

  // Score card
  scoreCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: Colors.surface,
    alignItems: 'center',
    gap: Spacing[4],
  },
  resultBadge: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  resultWin: {
    backgroundColor: Alpha.aqua08,
    borderColor: Alpha.aqua20,
  },
  resultLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.20)',
  },
  resultText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  resultTextWin: {
    color: Colors.aquaGreen,
  },
  resultTextLoss: {
    color: Colors.error,
  },
  teamsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'flex-start',
  },
  team: {
    flex: 1,
    gap: 4,
  },
  teamRight: {
    alignItems: 'flex-end',
  },
  teamLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  teamLabelHighlight: {
    color: Colors.opticYellow,
  },
  playerName: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  scoreCenter: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[4],
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  scoreNum: {
    fontFamily: Fonts.display,
    fontSize: 36,
    color: Colors.textPrimary,
  },
  scoreSep: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.textMuted,
  },
  statusLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  scoreEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  scoreInput: {
    width: 56,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: Fonts.display,
  },
  scoreDivider: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.textMuted,
  },

  // Metadata card
  metadataCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.surface,
    gap: Spacing[4],
  },
  metadataTitle: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  metadataGrid: {
    gap: Spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  metaItemLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  metaItemValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },

  // Chip selector
  chipSection: {
    gap: Spacing[2],
  },
  chipLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow08,
  },
  chipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: Colors.opticYellow,
  },

  // Edit actions
  editActions: {
    flexDirection: 'row',
    gap: Spacing[3],
    justifyContent: 'center',
    marginTop: Spacing[2],
  },

  // Timestamp card
  timestampCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.surface,
    gap: Spacing[2],
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestampLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  timestampValue: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
