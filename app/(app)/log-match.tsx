import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../src/providers/AuthProvider';
import { createMatchRecord } from '../../src/services/match-record-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../src/lib/constants';

// ─── Types ──────────────────────────────────────────────────────────────────
type MatchType = 'competitive' | 'friendly' | 'tournament';
type SetScore = { teamA: string; teamB: string };

const MATCH_TYPES: { key: MatchType; label: string; icon: string }[] = [
  { key: 'friendly', label: 'Friendly', icon: 'happy-outline' },
  { key: 'competitive', label: 'Competitive', icon: 'trophy-outline' },
  { key: 'tournament', label: 'Tournament', icon: 'podium-outline' },
];

const FORMATS = ['Americano', 'Mexicano', 'Team', 'Open Game'];

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function LogMatchScreen() {
  const { user } = useAuth();

  // Form state
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [matchType, setMatchType] = useState<MatchType>('friendly');
  const [format, setFormat] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [opponent1Name, setOpponent1Name] = useState('');
  const [opponent2Name, setOpponent2Name] = useState('');
  const [sets, setSets] = useState<SetScore[]>([{ teamA: '', teamB: '' }]);
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const addSet = () => {
    if (sets.length < 5) {
      setSets([...sets, { teamA: '', teamB: '' }]);
    }
  };

  const updateSet = (index: number, field: 'teamA' | 'teamB', value: string) => {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: value };
    setSets(updated);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate at least one set has scores
    const validSets = sets.filter(
      (s) => s.teamA.trim() !== '' && s.teamB.trim() !== '',
    );
    if (validSets.length === 0) {
      setScoreError('Enter at least one set score.');
      return;
    }
    setScoreError(null);

    setSaving(true);
    try {
      await createMatchRecord(
        {
          creator_id: user.id,
          played_at: date.toISOString(),
          match_type: matchType,
          format: format?.toLowerCase().replace(' ', '_') ?? null,
          partner_id: null,
          opponent1_id: null,
          opponent2_id: null,
          partner_name: partnerName.trim() || null,
          opponent1_name: opponent1Name.trim() || null,
          opponent2_name: opponent2Name.trim() || null,
          venue: venue.trim() || null,
          notes: notes.trim() || null,
          source: 'manual',
        },
        validSets.map((s, i) => ({
          set_number: i + 1,
          team_a_score: parseInt(s.teamA, 10) || 0,
          team_b_score: parseInt(s.teamB, 10) || 0,
        })),
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save match. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Log Match',
          headerBackTitle: '',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.bodySemiBold, fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView testID="screen-log-match" style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <Pressable
              testID="btn-match-date"
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={Colors.textDim} />
              <Text style={styles.dateText}>{dateStr}</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                themeVariant="dark"
                onChange={(_e, d) => {
                  setShowDatePicker(false);
                  if (d) setDate(d);
                }}
              />
            )}
          </View>

          {/* Match Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Match Type</Text>
            <View style={styles.chipRow}>
              {MATCH_TYPES.map((mt) => {
                const active = matchType === mt.key;
                return (
                  <Pressable
                    key={mt.key}
                    testID={`btn-type-${mt.key}`}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMatchType(mt.key);
                    }}
                  >
                    <Ionicons
                      name={mt.icon as any}
                      size={14}
                      color={active ? Colors.opticYellow : Colors.textMuted}
                    />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {mt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Format */}
          <View style={styles.field}>
            <Text style={styles.label}>Format (optional)</Text>
            <View style={styles.chipRow}>
              {FORMATS.map((f) => {
                const active = format === f;
                return (
                  <Pressable
                    key={f}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormat(active ? null : f);
                    }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Players */}
          <View style={styles.field}>
            <Text style={styles.label}>Partner (optional)</Text>
            <TextInput
              testID="input-partner"
              style={styles.input}
              value={partnerName}
              onChangeText={setPartnerName}
              placeholder="Partner name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Opponents</Text>
            <View style={styles.row}>
              <TextInput
                testID="input-opponent1"
                style={[styles.input, styles.inputHalf]}
                value={opponent1Name}
                onChangeText={setOpponent1Name}
                placeholder="Opponent 1"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                testID="input-opponent2"
                style={[styles.input, styles.inputHalf]}
                value={opponent2Name}
                onChangeText={setOpponent2Name}
                placeholder="Opponent 2"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {/* Score */}
          <View style={styles.field}>
            <Text style={styles.label}>Score</Text>
            {sets.map((s, i) => (
              <View key={i} style={styles.setRow}>
                <Text style={styles.setLabel}>Set {i + 1}</Text>
                <TextInput
                  testID={`input-set-${i + 1}-a`}
                  style={styles.scoreInput}
                  value={s.teamA}
                  onChangeText={(v) => updateSet(i, 'teamA', v)}
                  placeholder="Us"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.scoreDash}>-</Text>
                <TextInput
                  testID={`input-set-${i + 1}-b`}
                  style={styles.scoreInput}
                  value={s.teamB}
                  onChangeText={(v) => updateSet(i, 'teamB', v)}
                  placeholder="Them"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            ))}
            {sets.length < 5 && (
              <Pressable style={styles.addSetBtn} onPress={addSet}>
                <Ionicons name="add-circle-outline" size={16} color={Colors.aquaGreen} />
                <Text style={styles.addSetText}>Add Set</Text>
              </Pressable>
            )}
            {scoreError && (
              <Text style={styles.errorText}>{scoreError}</Text>
            )}
          </View>

          {/* Venue */}
          <View style={styles.field}>
            <Text style={styles.label}>Venue (optional)</Text>
            <TextInput
              testID="input-venue"
              style={styles.input}
              value={venue}
              onChangeText={setVenue}
              placeholder="Where did you play?"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              testID="input-notes"
              style={[styles.input, styles.inputMultiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes about this match..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* Save */}
          <Pressable
            testID="btn-save-match"
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : 'Save Match'}
            </Text>
          </Pressable>
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
  container: {
    padding: Spacing[5],
    paddingBottom: Spacing[12],
    gap: Spacing[5],
  },
  field: {
    gap: Spacing[2],
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputHalf: {
    flex: 1,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingVertical: 8,
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Alpha.yellow08,
    borderColor: Alpha.yellow20,
  },
  chipText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: Colors.opticYellow,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  setLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
    width: 44,
  },
  scoreInput: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.border,
    width: 56,
    textAlign: 'center',
  },
  scoreDash: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textMuted,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[2],
  },
  addSetText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.aquaGreen,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing[1],
  },
  saveBtn: {
    backgroundColor: Colors.opticYellow,
    borderRadius: Radius.md,
    paddingVertical: Spacing[4],
    alignItems: 'center',
    marginTop: Spacing[2],
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.darkBg,
  },
});
