import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, ShareCardColors } from '../../lib/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShareTheme = 'dark' | 'neon' | 'violet' | 'light';

interface ShareStylePickerProps {
  activeTheme: ShareTheme;
  onThemeChange: (theme: ShareTheme) => void;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const THEMES: { key: ShareTheme; label: string; swatch: string }[] = [
  { key: 'dark', label: 'Dark', swatch: ShareCardColors.darkBg },
  { key: 'neon', label: 'Neon', swatch: ShareCardColors.neonBg },
  { key: 'violet', label: 'Violet', swatch: ShareCardColors.violetBg },
  { key: 'light', label: 'Light', swatch: ShareCardColors.lightBg },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ShareStylePicker({
  activeTheme,
  onThemeChange,
}: ShareStylePickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>SHARE STYLE</Text>
      <View style={styles.row}>
        {THEMES.map((t) => {
          const isActive = t.key === activeTheme;
          return (
            <Pressable
              key={t.key}
              style={[styles.themeBtn, isActive && styles.themeBtnActive]}
              onPress={() => {
                if (t.key !== activeTheme) {
                  Haptics.selectionAsync();
                  onThemeChange(t.key);
                }
              }}
              hitSlop={4}
            >
              <View style={[styles.swatch, { backgroundColor: t.swatch }]}>
                {isActive && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={t.key === 'light' ? Colors.darkBg : Colors.textPrimary}
                  />
                )}
              </View>
              <Text style={[styles.themeLabel, isActive && styles.themeLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  themeBtn: {
    alignItems: 'center',
    gap: Spacing[1],
  },
  themeBtnActive: {},
  swatch: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  themeLabelActive: {
    color: Colors.opticYellow,
    fontFamily: Fonts.bodySemiBold,
  },
});
