import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '../../lib/constants';

type LoadingOverlayProps = {
  message?: string;
  visible?: boolean;
};

export function LoadingOverlay({ message, visible = true }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.opticYellow} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 28, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textDim,
  },
});
