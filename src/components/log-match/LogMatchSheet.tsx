import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../providers/AuthProvider';
import { updateProfile } from '../../services/profile-service';
import { Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import { ToolSelectionGrid } from './ToolSelectionGrid';
import { QuickActions } from './QuickActions';
import type { TrackingTool } from '../../lib/types';

type Props = {
  onDismiss: () => void;
};

export function LogMatchSheet({ onDismiss }: Props) {
  const { profile, user, refreshProfile } = useAuth();
  const tools = profile?.tracking_tools ?? [];
  const hasTools = tools.length > 0;

  // First-time setup state
  const [setupMode, setSetupMode] = useState(!hasTools);
  const [selected, setSelected] = useState<TrackingTool[]>([...tools]);
  const [saving, setSaving] = useState(false);

  const handleToggle = useCallback((tool: TrackingTool) => {
    setSelected((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  }, []);

  const handleSaveTools = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { tracking_tools: selected });
      await refreshProfile();
      setSetupMode(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (setupMode) {
    return (
      <View style={styles.container} testID="sheet-log-match">
        <Pressable
          style={styles.closeBtn}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
        >
          <Ionicons name="close" size={22} color={Colors.textMuted} />
        </Pressable>
        <Text style={styles.title}>How do you track your padel?</Text>
        <Text style={styles.subtitle}>
          Select the apps you use so we can personalise your import options.
        </Text>
        <ToolSelectionGrid selected={selected} onToggle={handleToggle} />
        <Pressable
          testID="btn-save-tools"
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSaveTools}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : selected.length > 0 ? 'Continue' : 'Skip for now'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="sheet-log-match">
      <Pressable
        style={styles.closeBtn}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={12}
      >
        <Ionicons name="close" size={22} color={Colors.textMuted} />
      </Pressable>
      <QuickActions onDismiss={onDismiss} hasTools={hasTools} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
    gap: Spacing[4],
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
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
