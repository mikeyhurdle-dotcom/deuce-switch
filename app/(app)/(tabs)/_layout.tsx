import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '../../../src/lib/constants';

// ─── Tab Icon ────────────────────────────────────────────────────────────────

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  home:     { active: 'home',       inactive: 'home-outline' },
  discover: { active: 'compass',    inactive: 'compass-outline' },
  play:     { active: 'tennisball', inactive: 'tennisball-outline' },
  stats:    { active: 'stats-chart', inactive: 'stats-chart-outline' },
  profile:  { active: 'person',     inactive: 'person-outline' },
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

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function TabLayout() {
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
      <Tabs.Screen
        name="play"
        options={{
          title: 'Play',
          tabBarTestID: 'tab-play',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="play" focused={focused} />,
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
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarTestID: 'tab-profile',
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon name="profile" focused={focused} />,
        } as any}
        listeners={makeListeners()}
      />
      {/* Hidden — content absorbed into Stats tab */}
      <Tabs.Screen
        name="history"
        options={{ href: null }}
      />
    </Tabs>
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
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
  },
});
