import { useEffect, useRef, useState } from 'react';
import { Redirect, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/providers/AuthProvider';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { Colors } from '../../src/lib/constants';
import { PROFILE_SETUP_KEY } from './profile-setup';
import { ONBOARDING_WIZARD_KEY } from './onboarding-wizard';
import {
  registerForPushNotifications,
  storePushToken,
} from '../../src/services/notification-service';

export default function AppLayout() {
  const { session, profile, loading } = useAuth();
  const [setupChecked, setSetupChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const pushRegistered = useRef(false);

  // Register push token on login
  useEffect(() => {
    if (!session?.user || pushRegistered.current) return;
    pushRegistered.current = true;

    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          await storePushToken(session.user.id, token);
        }
      } catch {
        // Non-critical — push registration can fail silently
      }
    })();
  }, [session?.user]);

  useEffect(() => {
    if (!session || !profile) {
      setSetupChecked(true);
      return;
    }

    // Check if user has completed profile setup + onboarding wizard
    Promise.all([
      AsyncStorage.getItem(PROFILE_SETUP_KEY),
      AsyncStorage.getItem(ONBOARDING_WIZARD_KEY),
    ])
      .then(([setupVal, onboardingVal]) => {
        if (setupVal === 'true') {
          setNeedsSetup(false);
        } else {
          // New user: no location AND no level set
          const isNew = !profile.location && profile.smashd_level == null;
          setNeedsSetup(isNew);
        }
        // Only show onboarding wizard for new users who haven't completed it
        setNeedsOnboarding(onboardingVal !== 'true' && !profile.location && profile.smashd_level == null);
      })
      .catch(() => {})
      .finally(() => setSetupChecked(true));
  }, [session, profile]);

  if (loading || !setupChecked) {
    return <LoadingOverlay message="Loading…" />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (needsSetup || needsOnboarding) {
    // New users go through the full onboarding wizard (which includes profile setup)
    return <Redirect href={'/(app)/onboarding-wizard' as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.darkBg },
        animation: 'fade',
      }}
    />
  );
}
