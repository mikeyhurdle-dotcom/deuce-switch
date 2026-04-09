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

  // PLA-479: Setup is now entirely opt-in. Users land in Quick Actions
  // immediately on every open. They can tap "Connect tracking tools" at
  // the bottom of Quick Actions to enter the setup step. This removes
  // the mandatory gate that previously blocked fresh users behind a
  // tool picker where none of the integrations actually work yet.
  const [setupMode, setSetupMode] = useState(false);
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

  // PLA-479: explicit skip that leaves the setup without writing anything.
  const handleSkipSetup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSetupMode(false);
    setSelected([...tools]); // reset any unsaved toggles
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
        <Text style={styles.title}>Which tracking apps do you use?</Text>
        <Text style={styles.subtitle}>
          Direct integrations are coming soon. For now we're recording which
          tools you use so we can prioritise the next rollout.
        </Text>
        <ToolSelectionGrid selected={selected} onToggle={handleToggle} />
        <Pressable
          testID="btn-save-tools"
          style={[styles.saveBtn, (saving || selected.length === 0) && styles.saveBtnDisabled]}
          onPress={handleSaveTools}
          disabled={saving || selected.length === 0}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : 'Save selection'}
          </Text>
        </Pressable>
        <Pressable
          testID="btn-skip-setup"
          style={styles.skipBtn}
          onPress={handleSkipSetup}
          disabled={saving}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
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
      <QuickActions onDismiss={onDismiss} />
      <Pressable
        testID="btn-connect-tools"
        style={styles.connectToolsBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSetupMode(true);
        }}
      >
        <Ionicons name="link-outline" size={14} color={Colors.textDim} />
        <Text style={styles.connectToolsText}>
          {tools.length > 0
            ? `Tracking tools (${tools.length} connected)`
            : 'Connect tracking tools'}
        </Text>
      </Pressable>
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
  skipBtn: {
    paddingVertical: Spacing[3],
    alignItems: 'center',
  },
  skipBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
    textDecorationLine: 'underline',
  },
  connectToolsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    marginTop: Spacing[2],
  },
  connectToolsText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },
});
