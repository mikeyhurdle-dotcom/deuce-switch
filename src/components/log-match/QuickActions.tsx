import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../lib/constants';

type ActionDef = {
  key: string;
  icon: string;
  label: string;
  subtitle: string;
  color: string;
  testID: string;
};

const ACTIONS: ActionDef[] = [
  {
    key: 'quick-score',
    icon: 'create-outline',
    label: 'Quick Score',
    subtitle: 'Log a match manually',
    color: Colors.opticYellow,
    testID: 'btn-quick-score',
  },
  {
    key: 'import',
    icon: 'camera-outline',
    label: 'Import Screenshot',
    subtitle: 'OCR from your tracking app',
    color: Colors.aquaGreen,
    testID: 'btn-import-screenshot',
  },
  {
    key: 'host',
    icon: 'add-circle-outline',
    label: 'Host Tournament',
    subtitle: 'Create an Americano',
    color: Colors.violet,
    testID: 'btn-sheet-host',
  },
  {
    key: 'join',
    icon: 'qr-code-outline',
    label: 'Join Tournament',
    subtitle: 'Enter a code or scan QR',
    color: Colors.coral,
    testID: 'btn-sheet-join',
  },
];

type Props = {
  onDismiss: () => void;
};

export function QuickActions({ onDismiss }: Props) {
  const router = useRouter();

  const handlePress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
    switch (key) {
      case 'quick-score':
        router.push('/(app)/log-match' as any);
        break;
      case 'import':
        router.push('/(app)/import-matches' as any);
        break;
      case 'host':
        router.push('/tournament/create' as any);
        break;
      case 'join':
        router.push('/(app)/join' as any);
        break;
    }
  };

  // PLA-480: show all actions unconditionally. "Import Screenshot" (OCR)
  // has no real dependency on which tracking platforms a user has toggled
  // in profile preferences — the service reads image pixels, not profile
  // flags. Previously gated on hasTools, which caused the OCR path to
  // silently disappear for fresh users and users who skipped the setup.
  const actions = ACTIONS;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How did you play today?</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            testID={action.testID}
            style={styles.card}
            onPress={() => handlePress(action.key)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={[styles.iconWrap, { backgroundColor: action.color + '18' }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
            </View>
            <Text style={styles.label}>{action.label}</Text>
            <Text style={styles.subtitle}>{action.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing[4],
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  card: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing[4],
    gap: Spacing[1],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
});
