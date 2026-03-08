import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '../lib/constants';

type ClockDisplayProps = {
  formattedTime: string;
  isRunning: boolean;
  isExpired: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function ClockDisplay({
  formattedTime,
  isRunning,
  isExpired,
  size = 'md',
}: ClockDisplayProps) {
  const fontSize = size === 'lg' ? 56 : size === 'md' ? 36 : 20;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.time,
          { fontSize },
          isExpired && styles.expired,
          !isRunning && !isExpired && styles.paused,
        ]}
      >
        {formattedTime}
      </Text>
      {isExpired && <Text style={styles.label}>TIME</Text>}
      {!isRunning && !isExpired && (
        <Text style={styles.label}>PAUSED</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontFamily: Fonts.mono,
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  expired: {
    color: Colors.error,
  },
  paused: {
    color: Colors.textDim,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
});
