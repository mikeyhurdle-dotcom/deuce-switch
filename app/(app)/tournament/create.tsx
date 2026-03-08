import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/providers/AuthProvider';
import { Colors, Fonts, TournamentDefaults } from '../../../src/lib/constants';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function CreateTournament() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [pointsPerMatch, setPointsPerMatch] = useState(
    String(TournamentDefaults.pointsPerMatch)
  );
  const [timePerRound, setTimePerRound] = useState(
    String(TournamentDefaults.timePerRoundSeconds / 60)
  );
  const [maxPlayers, setMaxPlayers] = useState(
    String(TournamentDefaults.maxPlayers)
  );
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your tournament a name.');
      return;
    }

    const points = parseInt(pointsPerMatch, 10);
    const time = parseInt(timePerRound, 10);
    const players = parseInt(maxPlayers, 10);

    if (isNaN(points) || points < 1) {
      Alert.alert('Invalid', 'Points per match must be a positive number.');
      return;
    }
    if (isNaN(time) || time < 1) {
      Alert.alert('Invalid', 'Time per round must be at least 1 minute.');
      return;
    }
    if (isNaN(players) || players < 4) {
      Alert.alert('Invalid', 'Need at least 4 players for an Americano.');
      return;
    }

    setLoading(true);
    try {
      const joinCode = generateJoinCode();

      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          name: name.trim(),
          format: 'americano',
          points_per_match: points,
          time_per_round_seconds: time * 60,
          max_players: players,
          join_code: joinCode,
          status: 'draft',
          organiser_id: user?.id,
          current_round: 0,
          master_clock_running: false,
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Creation failed', error.message);
        return;
      }

      // Auto-join the organiser as a player
      await supabase.from('tournament_players').insert({
        tournament_id: data.id,
        profile_id: user?.id,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/(app)/tournament/${data.id}/lobby`);
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
          headerTitle: 'New Tournament',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.mono, fontSize: 16, letterSpacing: 2 } as any,
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Input
              label="Tournament Name"
              placeholder="e.g. Friday Night Smash"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Points / Match"
                  placeholder="24"
                  value={pointsPerMatch}
                  onChangeText={setPointsPerMatch}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Minutes / Round"
                  placeholder="15"
                  value={timePerRound}
                  onChangeText={setTimePerRound}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Input
              label="Max Players"
              placeholder="16"
              value={maxPlayers}
              onChangeText={setMaxPlayers}
              keyboardType="number-pad"
            />

            <View style={styles.formatBadge}>
              <Text style={styles.formatLabel}>FORMAT</Text>
              <Text style={styles.formatValue}>Americano</Text>
            </View>
          </View>

          <Button
            title="CREATE TOURNAMENT"
            onPress={handleCreate}
            loading={loading}
            variant="primary"
            size="lg"
          />
        </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 32,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  formatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formatLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  formatValue: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.opticYellow,
  },
});
