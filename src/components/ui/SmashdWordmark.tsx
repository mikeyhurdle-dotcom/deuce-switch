import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../../lib/constants';

type SmashdWordmarkProps = {
  /** Font size — defaults to 22 (home header) */
  size?: number;
  /** Colour — defaults to opticYellow */
  color?: string;
  /** Whether to apply the neon glow shadow */
  glow?: boolean;
};

/**
 * SmashdWordmark
 *
 * Renders the "SMASHD" logotype in Permanent Marker — the Electric Court
 * display font. Use wherever the brand name appears as decorative text:
 * home header, leaderboard rank badges, TV mode, share cards.
 *
 * The SVG icon lockup (SmashdLogo) lives separately for cases where only
 * the icon mark is needed.
 */
export function SmashdWordmark({
  size = 22,
  color = Colors.opticYellow,
  glow = true,
}: SmashdWordmarkProps) {
  return (
    <Text
      style={[
        styles.wordmark,
        { fontSize: size, color },
        glow && styles.glow,
      ]}
      allowFontScaling={false}
    >
      SMASHD
    </Text>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontFamily: Fonts.display,
    lineHeight: undefined, // Permanent Marker needs natural line height
    includeFontPadding: false,
  },
  glow: {
    // iOS text shadow (neon yellow glow)
    textShadowColor: 'rgba(204, 255, 0, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
});
