import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing } from '../../lib/constants';

export function ProfileStats() {
  return (
    <Pressable
      style={styles.statSection}
      onPress={() => router.push('/(app)/(tabs)/stats')}
    >
      <View style={{ alignItems: 'center', paddingVertical: Spacing[8], gap: Spacing[3] }}>
        <Ionicons name="stats-chart" size={40} color={Colors.opticYellow} />
        <Text style={[styles.statSectionTitle, { textAlign: 'center' }]}>
          VIEW FULL STATS DASHBOARD
        </Text>
        <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: Colors.textDim, textAlign: 'center' }}>
          Detailed breakdowns by court side, conditions, partners, rivals, and more
        </Text>
      </View>
    </Pressable>
  );
}

// ── Styles ──��───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statSection: {
    marginBottom: Spacing[4],
    paddingHorizontal: Spacing[5],
  },
  statSectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: Spacing[2],
  },
});
