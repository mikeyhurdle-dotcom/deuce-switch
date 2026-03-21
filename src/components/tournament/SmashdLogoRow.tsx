import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SmashdLogo } from '../ui/SmashdLogo';
import { Colors, Fonts, Spacing } from '../../lib/constants';

// ── Props ─────────────────────────────────────────────────────────────────────

interface SmashdLogoRowProps {
  tournamentName: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SmashdLogoRow({ tournamentName }: SmashdLogoRowProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <SmashdLogo size={28} />
      <Text style={styles.name} numberOfLines={1}>
        {tournamentName}
      </Text>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textDim,
    letterSpacing: 0.3,
    maxWidth: '70%',
  },
});
