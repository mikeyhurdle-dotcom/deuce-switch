import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Alpha, Colors, Fonts } from '../../../src/lib/constants';
import { LogMatchTabButton } from '../../../src/components/ui/LogMatchTabButton';
import { LogMatchProvider, useLogMatch } from '../../../src/providers/LogMatchProvider';

// ─── Tab Icon ────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  home:     { active: 'home',        inactive: 'home-outline' },
  discover: { active: 'compass',     inactive: 'compass-outline' },
  coach:    { active: 'videocam',    inactive: 'videocam-outline' },
  stats:    { active: 'stats-chart', inactive: 'stats-chart-outline' },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons = TAB_ICONS[name];
  const iconName = focused ? icons.active : icons.inactive;
  const color = focused ? Colors.opticYellow : Colors.textMuted;

  return (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
      <Ionicons name={iconName} size={22} color={color} />
    </View>
  );
}

// ─── Haptic listener ─────────────────────────────────────────────────────────

function makeListeners() {
  return {
    tabPress: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  };
}

// ─── Inner Tabs (needs LogMatch context) ─────────────────────────────────────

function TabsInner() {
  const { openLogSheet } = useLogMatch();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.opticYellow,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* tabBarTestID is a valid React Navigation bottom tab option but missing from Expo Router types */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarTestID: 'tab-home',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="home" focused={focused} />,
        } as any}
        listeners={makeListeners()}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarTestID: 'tab-discover',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="discover" focused={focused} />,
        } as any}
        listeners={makeListeners()}
      />

      {/* ─── Centre raised button ─── */}
      <Tabs.Screen
        name="log"
        options={{
          title: '',
          tabBarTestID: 'tab-log-match',
          tabBarIcon: () => null,
          tabBarButton: (_props: any) => (
            <LogMatchTabButton
              testID="tab-log-match"
              onPress={openLogSheet}
            />
          ),
        } as any}
      />

      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarTestID: 'tab-coach',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="coach" focused={focused} />,
        } as any}
        listeners={makeListeners()}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarTestID: 'tab-stats',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="stats" focused={focused} />,
        } as any}
        listeners={makeListeners()}
      />

      {/* ─── Hidden routes (content migrated elsewhere) ─── */}
      <Tabs.Screen name="play"    options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Layout (wraps tabs with bottom sheet provider) ──────────────────────────

export default function TabLayout() {
  return (
    <LogMatchProvider>
      <TabsInner />
    </LogMatchProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 85,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconFocused: {
    backgroundColor: Alpha.yellow10,
  },
});
