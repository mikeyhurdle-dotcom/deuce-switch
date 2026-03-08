/**
 * Public Join Screen — /join/[tournamentId]
 *
 * Zero-friction tournament entry. This route lives OUTSIDE the (app) auth
 * guard so it works for both signed-in users and guests scanning a QR code.
 *
 * Flow:
 *  - Authenticated: tap "Join" → added to tournament → navigate to lobby
 *  - Guest: enter name → ghost profile created → success screen with
 *    claim token stored for later account creation
 *
 * "The app account is the reward after — not the gate."
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/AuthProvider';
import { Colors, Fonts, Radius } from '../../src/lib/constants';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';

type JoinState = 'loading' | 'ready' | 'joining' | 'success' | 'error';

type TournamentInfo = {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed';
  playerCount: number;
  maxPlayers: number | null;
  format: string;
};

const FORMAT_LABELS: Record<string, string> = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  team_americano: 'Team Americano',
  mixicano: 'Mixicano',
};

const CLAIM_TOKEN_KEY = 'smashd_claim_tokens';

export default function JoinViaLink() {
  const { id: tournamentId } = useLocalSearchParams<{ id: string }>();
  const { session, user, profile } = useAuth();
  const isAuthenticated = !!session;

  const [state, setState] = useState<JoinState>('loading');
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [joinResult, setJoinResult] = useState<{
    tournamentName: string;
    claimToken?: string;
  } | null>(null);

  // ── Fetch tournament info ──
  const fetchTournament = useCallback(async () => {
    if (!tournamentId) {
      setErrorMessage('Invalid tournament link');
      setState('error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, status, max_players, tournament_format')
        .eq('id', tournamentId)
        .single();

      if (error || !data) {
        setErrorMessage('Tournament not found');
        setState('error');
        return;
      }

      if (data.status === 'completed') {
        setErrorMessage('This tournament has already ended');
        setState('error');
        return;
      }

      // Get player count
      const { count } = await supabase
        .from('tournament_players')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', data.id)
        .eq('tournament_status', 'active');

      setTournament({
        id: data.id,
        name: data.name,
        status: data.status,
        playerCount: count ?? 0,
        maxPlayers: data.max_players,
        format: data.tournament_format,
      });
      setState('ready');
    } catch {
      setErrorMessage('Could not load tournament');
      setState('error');
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  // ── Handle Join ──
  const handleJoin = async () => {
    if (!tournamentId) return;

    // Guest validation
    if (!isAuthenticated && !displayName.trim()) {
      Alert.alert('Enter your name', 'We need a name for the scoreboard!');
      return;
    }

    setState('joining');

    try {
      const { data, error } = await supabase.rpc('join_tournament_via_link', {
        p_tournament_id: tournamentId,
        p_display_name: isAuthenticated ? null : displayName.trim(),
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        already_joined?: boolean;
        player_id?: string;
        claim_token?: string;
        tournament_name?: string;
        player_count?: number;
      };

      if (!result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Cannot Join', result.error ?? 'Something went wrong');
        setState('ready');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Authenticated user → navigate to lobby
      if (isAuthenticated) {
        if (result.already_joined) {
          router.replace(`/(app)/tournament/${tournamentId}/lobby`);
        } else {
          router.replace(`/(app)/tournament/${tournamentId}/lobby`);
        }
        return;
      }

      // Guest → store claim token + show success
      if (result.claim_token) {
        await storeClaimToken(tournamentId, result.claim_token);
      }

      setJoinResult({
        tournamentName: result.tournament_name ?? tournament?.name ?? 'Tournament',
        claimToken: result.claim_token,
      });
      setState('success');
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message ?? 'Failed to join');
      setState('ready');
    }
  };

  // ── Store claim token for later account creation ──
  const storeClaimToken = async (tid: string, token: string) => {
    try {
      const existing = await AsyncStorage.getItem(CLAIM_TOKEN_KEY);
      const tokens: Record<string, string> = existing ? JSON.parse(existing) : {};
      tokens[tid] = token;
      await AsyncStorage.setItem(CLAIM_TOKEN_KEY, JSON.stringify(tokens));
    } catch {
      // Non-critical — worst case they lose the claim link
    }
  };

  // ── Render ──

  if (state === 'loading') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <LoadingOverlay message="Loading tournament..." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Join Tournament',
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            {state === 'error' && <ErrorState message={errorMessage} />}
            {state === 'ready' && tournament && (
              <ReadyState
                tournament={tournament}
                isAuthenticated={isAuthenticated}
                profileName={profile?.display_name ?? user?.email?.split('@')[0] ?? null}
                displayName={displayName}
                onDisplayNameChange={setDisplayName}
                onJoin={handleJoin}
              />
            )}
            {state === 'joining' && (
              <View style={styles.centered}>
                <LoadingOverlay message="Joining tournament..." />
              </View>
            )}
            {state === 'success' && joinResult && (
              <SuccessState
                tournamentName={joinResult.tournamentName}
                playerName={displayName}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Card>
        <View style={styles.errorContent}>
          <Text style={styles.errorEmoji}>😕</Text>
          <Text style={styles.errorTitle}>Can't Join</Text>
          <Text style={styles.errorMessage}>{message}</Text>
          <Button
            title="GO BACK"
            onPress={() => router.back()}
            variant="outline"
            size="md"
          />
        </View>
      </Card>
    </View>
  );
}

function ReadyState({
  tournament,
  isAuthenticated,
  profileName,
  displayName,
  onDisplayNameChange,
  onJoin,
}: {
  tournament: TournamentInfo;
  isAuthenticated: boolean;
  profileName: string | null;
  displayName: string;
  onDisplayNameChange: (text: string) => void;
  onJoin: () => void;
}) {
  const isFull =
    tournament.maxPlayers !== null &&
    tournament.playerCount >= tournament.maxPlayers;

  return (
    <View style={styles.readyContainer}>
      {/* Tournament Info */}
      <Card variant="highlighted">
        <View style={styles.tournamentInfo}>
          <Text style={styles.joinLabel}>YOU'RE INVITED</Text>
          <Text style={styles.tournamentName}>{tournament.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                {FORMAT_LABELS[tournament.format] ?? tournament.format}
              </Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                {tournament.playerCount}
                {tournament.maxPlayers ? `/${tournament.maxPlayers}` : ''} PLAYERS
              </Text>
            </View>
            <View
              style={[
                styles.metaBadge,
                {
                  borderColor:
                    tournament.status === 'running'
                      ? Colors.aquaGreen
                      : Colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.metaBadgeText,
                  {
                    color:
                      tournament.status === 'running'
                        ? Colors.aquaGreen
                        : Colors.textMuted,
                  },
                ]}
              >
                {tournament.status === 'running' ? 'LIVE' : 'LOBBY'}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Auth-specific content */}
      {isAuthenticated ? (
        <Card>
          <View style={styles.authJoin}>
            <View style={styles.playerPreview}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profileName ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.joinAsLabel}>Joining as</Text>
                <Text style={styles.joinAsName}>
                  {profileName ?? 'Player'}
                </Text>
              </View>
            </View>
            <Button
              title={isFull ? 'TOURNAMENT FULL' : 'JOIN TOURNAMENT'}
              onPress={onJoin}
              variant="primary"
              size="lg"
              disabled={isFull}
            />
          </View>
        </Card>
      ) : (
        <Card>
          <View style={styles.guestJoin}>
            <Text style={styles.guestTitle}>Enter your name</Text>
            <Text style={styles.guestSubtitle}>
              No account needed — just your name for the scoreboard
            </Text>
            <Input
              label="YOUR NAME"
              placeholder="e.g. Ale Galán"
              value={displayName}
              onChangeText={onDisplayNameChange}
              autoCapitalize="words"
              autoFocus
            />
            <Button
              title={isFull ? 'TOURNAMENT FULL' : 'JOIN TOURNAMENT'}
              onPress={onJoin}
              variant="primary"
              size="lg"
              disabled={isFull || !displayName.trim()}
            />
          </View>
        </Card>
      )}

      {/* Footer hint */}
      {!isAuthenticated && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Create an account later to save your stats & connect with players
          </Text>
        </View>
      )}
    </View>
  );
}

function SuccessState({
  tournamentName,
  playerName,
}: {
  tournamentName: string;
  playerName: string;
}) {
  return (
    <View style={styles.centered}>
      <Card variant="glow">
        <View style={styles.successContent}>
          <Text style={styles.successEmoji}>🎾</Text>
          <Text style={styles.successTitle}>YOU'RE IN!</Text>
          <Text style={styles.successTournament}>{tournamentName}</Text>
          <Text style={styles.successName}>Playing as {playerName}</Text>

          <View style={styles.successDivider} />

          <Text style={styles.successHint}>
            The organiser will manage the matches.{'\n'}Just play and have fun!
          </Text>

          <View style={styles.successActions}>
            <Button
              title="CREATE ACCOUNT"
              onPress={() => router.replace('/(auth)/sign-in')}
              variant="primary"
              size="lg"
            />
            <Text style={styles.successSkip}>
              Save your stats, connect with players, track your progress
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },

  // ── Ready state ──
  readyContainer: {
    flex: 1,
    gap: 20,
  },
  tournamentInfo: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  joinLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.opticYellow,
    letterSpacing: 3,
  },
  tournamentName: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  // ── Authenticated join ──
  authJoin: {
    gap: 20,
    paddingVertical: 8,
  },
  playerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.mono,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  joinAsLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  joinAsName: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textPrimary,
  },

  // ── Guest join ──
  guestJoin: {
    gap: 16,
    paddingVertical: 8,
  },
  guestTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  guestSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    marginBottom: 4,
  },

  // ── Footer ──
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  footerText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Error state ──
  errorContent: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  errorEmoji: {
    fontSize: 40,
  },
  errorTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  errorMessage: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
    textAlign: 'center',
  },

  // ── Success state ──
  successContent: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    color: Colors.opticYellow,
  },
  successTournament: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  successName: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
  },
  successDivider: {
    width: 60,
    height: 2,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  successHint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  successActions: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  successSkip: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
