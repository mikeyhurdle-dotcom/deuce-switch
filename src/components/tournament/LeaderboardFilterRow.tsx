import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radius } from '../../lib/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeaderboardFilter = 'game' | 'allTime' | 'monthly';

interface LeaderboardFilterRowProps {
  activeFilter: LeaderboardFilter;
  onFilterChange: (filter: LeaderboardFilter) => void;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FILTERS: { key: LeaderboardFilter; label: string }[] = [
  { key: 'game', label: 'This Game' },
  { key: 'allTime', label: 'All Time' },
  { key: 'monthly', label: 'Monthly' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LeaderboardFilterRow({
  activeFilter,
  onFilterChange,
}: LeaderboardFilterRowProps) {
  return (
    <View style={styles.container}>
      {FILTERS.map((f) => {
        const isActive = f.key === activeFilter;
        return (
          <Pressable
            key={f.key}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => {
              if (f.key !== activeFilter) {
                Haptics.selectionAsync();
                onFilterChange(f.key);
              }
            }}
            hitSlop={4}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  pill: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    backgroundColor: Colors.opticYellow,
  },
  pillText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textDim,
    letterSpacing: 0.3,
  },
  pillTextActive: {
    color: Colors.darkBg,
  },
});
