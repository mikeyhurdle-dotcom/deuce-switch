import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Alpha, Colors, Fonts, Spacing, Radius, Shadows } from '../../../src/lib/constants';
import { AnimatedPressable, useSpringPress } from '../../../src/hooks/useSpringPress';
import { ErrorBoundary } from '../../../src/components/ErrorBoundary';

// ─── Format data ─────────────────────────────────────────────────────────────

type FormatKey = 'americano' | 'mexicano' | 'team_americano' | 'mixicano';

const FORMATS: {
  key: FormatKey;
  label: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bgColor: string;
}[] = [
  {
    key: 'americano',
    label: 'Americano',
    desc: 'Rotate partners every round',
    icon: 'shuffle-outline',
    color: Colors.opticYellow,
    bgColor: Alpha.yellow08,
  },
  {
    key: 'mexicano',
    label: 'Mexicano',
    desc: 'Skill-based pairing each round',
    icon: 'trending-up-outline',
    color: Colors.violet,
    bgColor: Alpha.violet10,
  },
  {
    key: 'team_americano',
    label: 'Team',
    desc: 'Fixed pairs, round-robin',
    icon: 'people-outline',
    color: Colors.aquaGreen,
    bgColor: Alpha.aqua08,
  },
  {
    key: 'mixicano',
    label: 'Mixicano',
    desc: 'Mixed doubles, rotating',
    icon: 'git-compare-outline',
    color: Colors.coral,
    bgColor: 'rgba(244, 114, 182, 0.1)',
  },
];

// ─── Quick action data ───────────────────────────────────────────────────────

const QUICK_ACTIONS: {
  label: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  route: string;
}[] = [
  {
    label: 'Join',
    desc: 'Enter a code',
    icon: 'qr-code-outline',
    color: Colors.aquaGreen,
    route: '/join',
  },
  {
    label: 'History',
    desc: 'Past games',
    icon: 'time-outline',
    color: Colors.textDim,
    route: '/(app)/(tabs)/stats',
  },
];

// ─── Pressable card components ───────────────────────────────────────────────

function FormatCard({
  format,
  onPress,
}: {
  format: (typeof FORMATS)[number];
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();

  return (
    <AnimatedPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${format.label}, ${format.desc}`}
      style={[styles.formatCard, { backgroundColor: format.bgColor }, animatedStyle]}
    >
      <View style={[styles.formatIconWrap, { backgroundColor: format.color + '18' }]}>
        <Ionicons name={format.icon} size={22} color={format.color} />
      </View>
      <Text style={styles.formatLabel}>{format.label}</Text>
      <Text style={styles.formatDesc}>{format.desc}</Text>
    </AnimatedPressable>
  );
}

function QuickActionCard({
  action,
  onPress,
}: {
  action: (typeof QUICK_ACTIONS)[number];
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();

  return (
    <AnimatedPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${action.label}, ${action.desc}`}
      style={[styles.quickAction, animatedStyle]}
    >
      <View style={[styles.quickIconWrap, { backgroundColor: action.color + '14' }]}>
        <Ionicons name={action.icon} size={20} color={action.color} />
      </View>
      <View>
        <Text style={styles.quickLabel}>{action.label}</Text>
        <Text style={styles.quickDesc}>{action.desc}</Text>
      </View>
    </AnimatedPressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PlayScreen() {
  const router = useRouter();
  const createPress = useSpringPress();

  return (
    <ErrorBoundary fallbackMessage="Play couldn't load. Tap retry to try again.">
    <SafeAreaView testID="screen-play" style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Play</Text>
          <Text style={styles.headerSub}>Pick a format and start competing</Text>
        </View>

        {/* Hero CTA — Create Tournament */}
        <AnimatedPressable
          testID="btn-create-tournament"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/tournament/create');
          }}
          onPressIn={createPress.onPressIn}
          onPressOut={createPress.onPressOut}
          accessibilityRole="button"
          accessibilityLabel="Create Tournament"
          style={[styles.heroCta, createPress.animatedStyle]}
        >
          <LinearGradient
            colors={[Alpha.yellow12, 'rgba(204, 255, 0, 0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroLeft}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="add-circle" size={28} color={Colors.opticYellow} />
              </View>
              <View>
                <Text style={styles.heroLabel}>Create Tournament</Text>
                <Text style={styles.heroDesc}>
                  Set up a new game in under 30 seconds
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.opticYellow}
            />
          </LinearGradient>
        </AnimatedPressable>

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.label}
              action={action}
              onPress={() => router.push(action.route as any)}
            />
          ))}
        </View>

        {/* Section: Choose Format */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose a Format</Text>
            <Text style={styles.sectionCaption}>Quick-create with defaults</Text>
          </View>
          <View style={styles.formatGrid}>
            {FORMATS.map((format) => (
              <FormatCard
                key={format.key}
                format={format}
                onPress={() => router.push('/tournament/create')}
              />
            ))}
          </View>
        </View>

        {/* Section: How it Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            {[
              { step: '1', text: 'Create or join a tournament', icon: 'add-outline' as const },
              { step: '2', text: 'Players check in at the lobby', icon: 'people-outline' as const },
              { step: '3', text: 'Play rounds, enter scores live', icon: 'tennisball-outline' as const },
              { step: '4', text: 'See results and share stats', icon: 'trophy-outline' as const },
            ].map((item, i) => (
              <View key={item.step} style={styles.stepRow}>
                <View style={styles.stepNumberWrap}>
                  <Text style={styles.stepNumber}>{item.step}</Text>
                  {i < 3 && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepContent}>
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={Colors.textDim}
                    style={styles.stepIcon}
                  />
                  <Text style={styles.stepText}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </ErrorBoundary>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  scroll: {
    paddingBottom: Spacing[12],
  },

  // Header
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[4],
  },
  headerTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textDim,
    marginTop: 2,
  },

  // Hero CTA
  heroCta: {
    marginHorizontal: Spacing[5],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Alpha.yellow20,
    overflow: 'hidden',
    ...Shadows.glowYellow,
  },
  heroGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[5],
    paddingHorizontal: Spacing[5],
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    flex: 1,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Alpha.yellow12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  heroDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
    marginTop: 2,
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  quickDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Section
  section: {
    marginTop: Spacing[8],
    paddingHorizontal: Spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing[4],
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  sectionCaption: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Format grid
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  formatCard: {
    width: '48%',
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[2],
  },
  formatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  formatDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 16,
  },

  // Steps
  stepsContainer: {
    marginTop: Spacing[4],
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[4],
  },
  stepNumberWrap: {
    alignItems: 'center',
    width: 28,
  },
  stepNumber: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.opticYellow,
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: 'center',
    borderRadius: 14,
    backgroundColor: Alpha.yellow10,
    overflow: 'hidden',
  },
  stepLine: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flex: 1,
    paddingVertical: Spacing[1],
  },
  stepIcon: {
    marginTop: 1,
  },
  stepText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
