import { useFonts } from 'expo-font';
import { Slot, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '../src/providers/AuthProvider';
import { ConsentGate } from '../src/providers/ConsentGate';
import {
  addNotificationResponseListener,
  type NotificationData,
} from '../src/services/notification-service';
import { Colors } from '../src/lib/constants';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Outfit: require('../assets/fonts/Outfit-Variable.ttf'),
    'Outfit-Medium': require('../assets/fonts/Outfit-Variable.ttf'),
    'Outfit-SemiBold': require('../assets/fonts/Outfit-Variable.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Variable.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Handle notification taps — navigate to the relevant screen
  useEffect(() => {
    const cleanup = addNotificationResponseListener((data: NotificationData) => {
      if (data.tournamentId) {
        if (data.type === 'tournament_completed') {
          router.push(`/(app)/tournament/${data.tournamentId}/results`);
        } else {
          router.push(`/(app)/tournament/${data.tournamentId}/play`);
        }
      }
    });

    return cleanup;
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ConsentGate>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </ConsentGate>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
});
