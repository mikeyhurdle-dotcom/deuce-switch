import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';

export function PadelDNACard() {
  return (
    <LinearGradient
      colors={['#1A1328', '#2D2440']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <Ionicons name="finger-print" size={22} color={Colors.violet} />
        <Text style={styles.title}>Padel DNA</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
      </View>
      <Text style={styles.description}>
        Your shareable identity card — dominant shot, play style, clutch rating, and more.
        Unlocks after 5 matches with shot data.
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing[5],
    borderWidth: 1,
    borderColor: Alpha.violet08,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: Alpha.violet08,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Alpha.violet08,
  },
  badgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.violet,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
    lineHeight: 18,
  },
});
