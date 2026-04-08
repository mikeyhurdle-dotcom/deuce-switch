import { useEffect, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-react-native';
import { useAuth } from './AuthProvider';
import { setPostHogInstance } from '../services/analytics';

const APP_FIRST_OPEN_KEY = '@smashd/first_open_tracked';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

/**
 * Identifies the current user in PostHog whenever auth state changes.
 * Placed inside both AuthProvider and PostHogProvider so it can read both.
 */
function PostHogIdentifier({ children }: { children: ReactNode }) {
  const posthog = usePostHog();
  const { user, profile } = useAuth();

  const appOpenTracked = useRef(false);

  useEffect(() => {
    if (posthog) setPostHogInstance(posthog);
  }, [posthog]);

  // Track first-ever app open and every subsequent foreground
  useEffect(() => {
    if (!posthog) return;

    const trackOpen = async () => {
      if (appOpenTracked.current) return;
      appOpenTracked.current = true;

      // Check if this is the very first open
      const alreadyTracked = await AsyncStorage.getItem(APP_FIRST_OPEN_KEY);
      if (!alreadyTracked) {
        posthog.capture('app_first_open', { platform: 'ios' });
        await AsyncStorage.setItem(APP_FIRST_OPEN_KEY, new Date().toISOString());
      }

      posthog.capture('app_opened');
    };

    trackOpen();

    // Also track when app returns to foreground
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        posthog.capture('app_opened');
      }
    });

    return () => sub.remove();
  }, [posthog]);

  useEffect(() => {
    if (user && posthog) {
      posthog.identify(user.id, {
        email: user.email ?? null,
        display_name: profile?.display_name ?? null,
        preferred_position: profile?.preferred_position ?? null,
        smashd_level: profile?.smashd_level ?? null,
      });
    } else if (!user && posthog) {
      posthog.reset();
    }
  }, [user?.id, profile?.display_name, posthog]);

  return <>{children}</>;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  if (!POSTHOG_API_KEY) {
    // No key configured — render children without analytics
    return <>{children}</>;
  }

  return (
    <PHProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        enableSessionReplay: false,
      }}
      autocapture={{
        captureScreens: true,
        captureTouches: false,
      }}
    >
      <PostHogIdentifier>{children}</PostHogIdentifier>
    </PHProvider>
  );
}
