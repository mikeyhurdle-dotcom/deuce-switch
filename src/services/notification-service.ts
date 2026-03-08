/**
 * Notification Service — Push + Local Notifications
 *
 * Handles:
 * - Permission requests and Expo Push Token registration
 * - Token storage in Supabase (push_tokens table)
 * - Local notification helpers for in-app alerts
 * - Notification response handling
 *
 * Server-side push (via Supabase Edge Functions) can be added later.
 * For MVP, local notifications fire when Realtime events arrive.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const NOTIFICATION_PERMISSION_KEY = 'smashd_notification_permission_requested';

// ─── Web guard: expo-notifications APIs are not available on web ──────────────

const isNative = Platform.OS !== 'web';

// ─── Configure notification behavior ────────────────────────────────────────

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Schedule a local notification (no-op on web) */
async function scheduleLocal(
  content: Notifications.NotificationContentInput,
): Promise<void> {
  if (!isNative) return;
  await Notifications.scheduleNotificationAsync({ content, trigger: null });
}

// ─── Push Token Registration ────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  // Push only works on physical devices
  if (!Device.isDevice) {
    console.log('[notifications] Skipping push registration — not a physical device');
    return null;
  }

  // Check / request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[notifications] Permission not granted');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tournament', {
      name: 'Tournament Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#CCFF00', // opticYellow — Android notification channel
      sound: 'default',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses app.json extra.eas.projectId
    });
    return tokenData.data;
  } catch (error) {
    console.error('[notifications] Failed to get push token:', error);
    return null;
  }
}

/**
 * Store push token in Supabase for server-side push notifications.
 * Uses upsert on (user_id, platform) to avoid duplicates per device type.
 */
export async function storePushToken(
  userId: string,
  token: string,
): Promise<void> {
  try {
    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' },
    );
  } catch (error) {
    // Table may not exist yet — fail silently for MVP
    console.warn('[notifications] Could not store push token:', error);
  }
}

/**
 * Remove push token on sign-out
 */
export async function removePushToken(userId: string): Promise<void> {
  try {
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('platform', Platform.OS);
  } catch {
    // Fail silently
  }
}

// ─── First-Join Permission Request ──────────────────────────────────────────

/**
 * Request notification permission on first tournament join.
 * Uses AsyncStorage to ensure the OS prompt is only shown once.
 * Registers the push token with Supabase if granted.
 */
export async function requestNotificationPermissionOnJoin(
  userId: string,
): Promise<void> {
  if (!isNative) return;

  try {
    const alreadyRequested = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    if (alreadyRequested === 'true') {
      // Already prompted — just ensure token is registered
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        const token = await getExpoPushToken();
        if (token) await storePushToken(userId, token);
      }
      return;
    }

    // First time — request permission and mark as requested
    const token = await registerForPushNotifications();
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');

    if (token) {
      await storePushToken(userId, token);
    }
  } catch (error) {
    console.warn('[notifications] Permission request on join failed:', error);
  }
}

/** Internal helper to get Expo push token without requesting permission */
async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    });
    return tokenData.data;
  } catch {
    return null;
  }
}

// ─── Local Notification Helpers ─────────────────────────────────────────────

/**
 * Show a local notification for round advancement
 */
export async function notifyRoundStarted(
  tournamentName: string,
  roundNumber: number,
): Promise<void> {
  await scheduleLocal({
    title: `Round ${roundNumber} Starting`,
    body: `${tournamentName} — head to your court!`,
    sound: 'default',
    data: { type: 'round_started', roundNumber },
  });
}

/**
 * Show a local notification when tournament begins
 */
export async function notifyTournamentStarted(
  tournamentName: string,
): Promise<void> {
  await scheduleLocal({
    title: 'Tournament Starting!',
    body: `${tournamentName} is now live. Check your first match.`,
    sound: 'default',
    data: { type: 'tournament_started' },
  });
}

/**
 * Show a local notification when a score is submitted for your match
 */
export async function notifyScoreSubmitted(
  courtNumber: number | null,
  teamAScore: number,
  teamBScore: number,
): Promise<void> {
  await scheduleLocal({
    title: 'Score Submitted',
    body: `Court ${courtNumber ?? '—'}: ${teamAScore} – ${teamBScore}`,
    sound: 'default',
    data: { type: 'score_submitted' },
  });
}

/**
 * Show a local notification when tournament is completed
 */
export async function notifyTournamentCompleted(
  tournamentName: string,
): Promise<void> {
  await scheduleLocal({
    title: 'Tournament Complete!',
    body: `${tournamentName} has ended. Check the final standings!`,
    sound: 'default',
    data: { type: 'tournament_completed' },
  });
}

/**
 * Show a local notification for clock expiry
 */
export async function notifyClockExpired(): Promise<void> {
  await scheduleLocal({
    title: "Time's Up!",
    body: 'Round timer has expired. Submit your score.',
    sound: 'default',
    data: { type: 'clock_expired' },
  });
}

// ─── Notification Response Handler ──────────────────────────────────────────

export type NotificationData = {
  type:
    | 'round_started'
    | 'tournament_started'
    | 'score_submitted'
    | 'tournament_completed'
    | 'clock_expired';
  tournamentId?: string;
  roundNumber?: number;
};

/**
 * Add a listener for when user taps a notification.
 * Returns a cleanup function.
 */
export function addNotificationResponseListener(
  handler: (data: NotificationData) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content
        .data as NotificationData;
      handler(data);
    },
  );

  return () => subscription.remove();
}

/**
 * Add a listener for notifications received while app is foregrounded.
 * Returns a cleanup function.
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
): () => void {
  const subscription =
    Notifications.addNotificationReceivedListener(handler);

  return () => subscription.remove();
}
