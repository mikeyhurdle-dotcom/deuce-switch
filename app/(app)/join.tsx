import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/AuthProvider';
import { requestNotificationPermissionOnJoin } from '../../src/services/notification-service';
import { Colors, Fonts } from '../../src/lib/constants';
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

      // Check if already joined
      const { data: existing } = await supabase
        .from('tournament_players')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('player_id', user?.id)
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

      if (count !== null && tournament.max_players && count >= tournament.max_players) {
        Alert.alert('Full', 'This tournament is full.');
        return;
      }

      // Join the tournament
      const { error: joinError } = await supabase
        .from('tournament_players')
        .insert({
          tournament_id: tournament.id,
          player_id: user?.id,
        });

      if (joinError) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Join failed', joinError.message);
        return;
      }

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
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.mono, fontSize: 16, letterSpacing: 2 } as any,
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.heading}>Enter Join Code</Text>
            <Text style={styles.subtitle}>
              Ask the tournament organiser for the 4-character code
            </Text>

            <Input
              label="Join Code"
              placeholder="e.g. 7X2K"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              style={styles.codeInput}
            />

            <Button
              title="JOIN"
              onPress={handleJoin}
              loading={loading}
              variant="primary"
              size="lg"
            />
          </View>

          {/* QR Scanner — coming soon */}
          <View style={styles.qrSection}>
            <View style={styles.qrComingSoon}>
              <Text style={styles.qrIcon}>📷</Text>
              <Text style={styles.qrText}>QR scanning coming soon</Text>
            </View>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  content: {
    gap: 16,
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
    marginBottom: 8,
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
    gap: 8,
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
