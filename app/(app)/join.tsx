import { useState } from 'react';
import { Alert, AlertButton, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/AuthProvider';
import { requestNotificationPermissionOnJoin } from '../../src/services/notification-service';
import { getUnclaimedGhosts, claimGhostPlayer } from '../../src/services/tournament-service';
import { trackPlayerJoined } from '../../src/services/analytics';
import { Colors, Fonts, Spacing } from '../../src/lib/constants';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

export default function JoinTournament() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Enter a code', 'Please enter the tournament join code.');
      return;
    }

    setLoading(true);
    try {
      // Look up tournament by join code
      const { data: tournament, error: findError } = await supabase
        .from('tournaments')
        .select('id, name, status, max_players')
        .eq('join_code', trimmed)
        .single();

      if (findError || !tournament) {
        Alert.alert('Not found', 'No tournament found with that code.');
        return;
      }

      if (tournament.status === 'completed') {
        Alert.alert('Finished', 'This tournament has already ended.');
        return;
      }

      if (!user?.id) {
        Alert.alert('Not signed in', 'Please sign in to join a tournament.');
        return;
      }

      // Check if already joined
      const { data: existing } = await supabase
        .from('tournament_players')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('player_id', user.id)
        .maybeSingle();

      if (existing) {
        // Already in — go straight to the tournament
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace(`/(app)/tournament/${tournament.id}/lobby`);
        return;
      }

      // Check player count
      const { count } = await supabase
        .from('tournament_players')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id);

      const isFull = count !== null && tournament.max_players != null && count >= tournament.max_players;

      if (isFull) {
        // Tournament full — check for claimable ghost (imported) players
        const ghosts = await getUnclaimedGhosts(tournament.id);
        if (ghosts.length === 0) {
          Alert.alert('Full', 'This tournament is full.');
          return;
        }

        // Show picker so user can claim their imported slot
        const buttons: AlertButton[] = ghosts.map((g) => ({
          text: g.displayName,
          onPress: async () => {
            setLoading(true);
            try {
              await claimGhostPlayer(tournament.id, g.id, user.id);
              trackPlayerJoined({ tournamentId: tournament.id, method: 'claim_ghost' });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              requestNotificationPermissionOnJoin(user.id).catch(() => {});
              router.replace(`/(app)/tournament/${tournament.id}/lobby`);
            } catch (e: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Claim failed', e.message ?? 'Could not claim player');
            } finally {
              setLoading(false);
            }
          },
        }));
        buttons.push({ text: 'Cancel', style: 'cancel' as const });

        Alert.alert(
          'Claim Your Spot',
          'This tournament is full, but there are imported players you can claim. Which one are you?',
          buttons,
        );
        return;
      }

      // Join the tournament — unique constraint prevents double-join
      const { error: joinError } = await supabase
        .from('tournament_players')
        .insert({
          tournament_id: tournament.id,
          player_id: user.id,
        });

      if (joinError) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Join failed', joinError.message);
        return;
      }

      trackPlayerJoined({ tournamentId: tournament.id, method: 'join_code' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Request notification permission on first tournament join
      if (user?.id) {
        requestNotificationPermissionOnJoin(user.id).catch(() => {
          // Non-blocking — don't prevent navigation if permission fails
        });
      }

      router.replace(`/(app)/tournament/${tournament.id}/lobby`);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Join Tournament',
          headerBackTitle: '',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.mono, fontSize: 16 },
        }}
      />
      <SafeAreaView testID="screen-join" style={styles.safe} edges={['bottom']}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <Text style={styles.heading}>Enter Join Code</Text>
              <Text style={styles.subtitle}>
                Ask the tournament organiser for the 4-character code
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
              <Input
                label="Join Code"
                placeholder="e.g. 7X2K"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                style={styles.codeInput}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
              <Button
                title="JOIN"
                onPress={handleJoin}
                loading={loading}
                variant="primary"
                size="lg"
              />
            </Animated.View>
          </View>

          {/* QR Scanner */}
          <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} style={styles.qrSection}>
            <View style={styles.qrComingSoon}>
              <Text style={styles.qrIcon}>📷</Text>
              <Text style={styles.qrText}>Or scan the tournament QR code</Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[10],
    justifyContent: 'space-between',
  },
  content: {
    gap: Spacing[4],
  },
  heading: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
    marginBottom: Spacing[2],
  },
  codeInput: {
    fontFamily: Fonts.mono,
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 8,
  },
  qrSection: {
    alignItems: 'center',
  },
  qrComingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    opacity: 0.4,
  },
  qrIcon: {
    fontSize: 18,
  },
  qrText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
