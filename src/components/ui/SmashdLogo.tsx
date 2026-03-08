import React from 'react';
import { Image, StyleSheet } from 'react-native';

type SmashdLogoProps = {
  size?: number;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoSource = require('../../../assets/images/smashd-logo.svg');

export function SmashdLogo({ size = 48 }: SmashdLogoProps) {
  return (
    <Image
      source={logoSource}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    borderRadius: 8,
  },
});
