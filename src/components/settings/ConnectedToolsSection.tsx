import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../providers/AuthProvider';
import { updateProfile } from '../../services/profile-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';
import { TRACKING_TOOLS } from '../log-match/ToolSelectionGrid';
import type { TrackingTool } from '../../lib/types';

export function ConnectedToolsSection() {
  const { profile, user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const tools: TrackingTool[] = profile?.tracking_tools ?? [];

  const handleToggle = useCallback(
    async (tool: TrackingTool) => {
      if (!user) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const updated = tools.includes(tool)
        ? tools.filter((t) => t !== tool)
        : [...tools, tool];

      setSaving(true);
      try {
        await updateProfile(user.id, { tracking_tools: updated });
        await refreshProfile();
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Could not update. Try again.');
      } finally {
        setSaving(false);
      }
    },
    [user, tools, refreshProfile],
  );

  return (
    <View style={styles.container} testID="section-connected-tools">
      {TRACKING_TOOLS.map((tool) => {
        const active = tools.includes(tool.key);
        return (
          <View key={tool.key} style={styles.row}>
            <View style={[styles.logo, { backgroundColor: tool.color }]}>
              <Text style={styles.logoText}>{tool.logo}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{tool.name}</Text>
              <View style={styles.badges}>
                {tool.badges.map((b) => (
                  <View key={b} style={styles.badge}>
                    <Text style={styles.badgeText}>{b}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Switch
              testID={`switch-tool-${tool.key}`}
              value={active}
              onValueChange={() => handleToggle(tool.key)}
              disabled={saving}
              trackColor={{ false: Colors.surface, true: Colors.opticYellow }}
              thumbColor={active ? Colors.darkBg : Colors.textMuted}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
});
