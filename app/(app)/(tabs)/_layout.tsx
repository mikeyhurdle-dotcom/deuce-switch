import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '../../../src/lib/constants';

const icons: Record<string, string> = {
  home: '\u26A1',
  profile: '\uD83D\uDC64',
  history: '\uD83D\uDCCB',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const emoji = icons[name] ?? '\u2022';
  return (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
      <Text style={styles.iconEmoji}>{emoji}</Text>
    </View>
  );
}

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
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

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
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconFocused: {
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
  },
  iconEmoji: {
    fontSize: 20,
  },
});
