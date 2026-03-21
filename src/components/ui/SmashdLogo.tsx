import React from 'react';
import { View, StyleSheet } from 'react-native';
import Logo from '../../../assets/images/smashd-logo.svg';

type SmashdLogoProps = {
  size?: number;
};

export function SmashdLogo({ size = 48 }: SmashdLogoProps) {
  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Smashd logo"
    >
      <Logo width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
