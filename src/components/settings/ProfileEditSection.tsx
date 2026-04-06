import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { updateProfile } from '../../services/profile-service';
import { useAuth } from '../../providers/AuthProvider';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import type { Profile } from '../../lib/types';

type Props = {
  profile: Profile | null;
  userId: string;
};

type Position = 'left' | 'right' | 'both';

const POSITION_OPTIONS: { value: Position; label: string; icon: string }[] = [
  { value: 'left', label: 'Left', icon: 'arrow-back' },
  { value: 'right', label: 'Right', icon: 'arrow-forward' },
  { value: 'both', label: 'Both', icon: 'swap-horizontal' },
];

export function ProfileEditSection({ profile, userId }: Props) {
  const { refreshProfile } = useAuth();

  // Form state — initialised from profile
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [racketBrand, setRacketBrand] = useState('');
  const [racketModel, setRacketModel] = useState('');
  const [shoeBrand, setShoeBrand] = useState('');
  const [shoeModel, setShoeModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync form from profile on mount / profile refresh
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setBio(profile.bio ?? '');
    setPosition(profile.preferred_position ?? null);
    setRacketBrand(profile.racket_brand ?? '');
    setRacketModel(profile.racket_model ?? '');
    setShoeBrand(profile.shoe_brand ?? '');
    setShoeModel(profile.shoe_model ?? '');
    setDirty(false);
  }, [profile]);

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await updateProfile(userId, {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        preferred_position: position,
        racket_brand: racketBrand.trim() || null,
        racket_model: racketModel.trim() || null,
        shoe_brand: shoeBrand.trim() || null,
        shoe_model: shoeModel.trim() || null,
      });
      await refreshProfile();
      setDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Display Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          testID="input-display-name"
          style={styles.input}
          value={displayName}
          onChangeText={markDirty(setDisplayName)}
          placeholder="Your name"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
        />
      </View>

      {/* Bio */}
      <View style={styles.field}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          testID="input-bio"
          style={[styles.input, styles.inputMultiline]}
          value={bio}
          onChangeText={markDirty(setBio)}
          placeholder="Tell others about your game..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
      </View>

      {/* Preferred Position */}
      <View style={styles.field}>
        <Text style={styles.label}>Preferred Position</Text>
        <View style={styles.chipRow}>
          {POSITION_OPTIONS.map((opt) => {
            const active = position === opt.value;
            return (
              <Pressable
                key={opt.value}
                testID={`btn-position-${opt.value}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  markDirty(setPosition)(opt.value);
                }}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={14}
                  color={active ? Colors.opticYellow : Colors.textMuted}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Equipment */}
      <View style={styles.field}>
        <Text style={styles.label}>Racket</Text>
        <View style={styles.equipmentRow}>
          <TextInput
            testID="input-racket-brand"
            style={[styles.input, styles.inputHalf]}
            value={racketBrand}
            onChangeText={markDirty(setRacketBrand)}
            placeholder="Brand"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            testID="input-racket-model"
            style={[styles.input, styles.inputHalf]}
            value={racketModel}
            onChangeText={markDirty(setRacketModel)}
            placeholder="Model"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Shoes</Text>
        <View style={styles.equipmentRow}>
          <TextInput
            testID="input-shoe-brand"
            style={[styles.input, styles.inputHalf]}
            value={shoeBrand}
            onChangeText={markDirty(setShoeBrand)}
            placeholder="Brand"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            testID="input-shoe-model"
            style={[styles.input, styles.inputHalf]}
            value={shoeModel}
            onChangeText={markDirty(setShoeModel)}
            placeholder="Model"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {/* Save Button */}
      {dirty && (
        <Pressable
          testID="btn-save-profile"
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[4],
  },
  field: {
    gap: Spacing[1],
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
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputHalf: {
    flex: 1,
  },
  equipmentRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  chipRow: {
    flexDirection: 'row',
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
  saveBtn: {
    backgroundColor: Colors.opticYellow,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    alignItems: 'center',
    marginTop: Spacing[2],
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.darkBg,
  },
});
