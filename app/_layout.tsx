import { useFonts } from 'expo-font';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import {
  Exo2_400Regular,
  Exo2_500Medium,
  Exo2_600SemiBold,
  Exo2_700Bold,
} from '@expo-google-fonts/exo-2';
import { Slot, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '../src/providers/AuthProvider';
import { ConsentGate } from '../src/providers/ConsentGate';
import { PostHogProvider } from '../src/providers/PostHogProvider';
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
    // Exo 2 — body/heading font (replaces Outfit)
    Exo2_400Regular,
    Exo2_500Medium,
    Exo2_600SemiBold,
    Exo2_700Bold,
    // Permanent Marker — display/CTA font
    PermanentMarker: PermanentMarker_400Regular,
  });

  useEffect(() => {
    if (fontError) {
      // Log font error but don't crash — render with system fonts instead
      console.warn('Font loading failed:', fontError);
      SplashScreen.hideAsync();
    }
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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ConsentGate>
        <AuthProvider>
          <PostHogProvider>
            <Slot />
          </PostHogProvider>
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
