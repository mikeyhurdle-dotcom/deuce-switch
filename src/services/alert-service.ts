/**
 * Alert Service — Spot Alert Subscriptions
 *
 * Manages user subscriptions for event spot alerts.
 * When an event goes from FULL → spots available, subscribed users get notified.
 *
 * CURRENT: Uses AsyncStorage for local persistence (works without backend).
 * FUTURE: When `event_alerts` Supabase table exists, swap to server-side persistence
 *         and wire to Edge Function for push notifications.
 *
 * PREREQUISITE: Supabase migration needed:
 *   CREATE TABLE event_alerts (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id uuid REFERENCES auth.users NOT NULL,
 *     event_id uuid NOT NULL,
 *     event_type text NOT NULL DEFAULT 'play',
 *     created_at timestamptz DEFAULT now()
 *   );
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ALERTS_KEY = 'smashd_event_alerts';

/**
 * Get all subscribed event IDs.
 */
export async function getAlertSubscriptions(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(ALERTS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/**
 * Subscribe to spot alerts for an event.
 */
export async function subscribeToEvent(eventId: string): Promise<void> {
  const subs = await getAlertSubscriptions();
  subs.add(eventId);
  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(Array.from(subs)));
}

/**
 * Unsubscribe from spot alerts for an event.
 */
export async function unsubscribeFromEvent(eventId: string): Promise<void> {
  const subs = await getAlertSubscriptions();
  subs.delete(eventId);
  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(Array.from(subs)));
}

/**
 * Toggle subscription for an event. Returns new state.
 */
export async function toggleEventAlert(eventId: string): Promise<boolean> {
  const subs = await getAlertSubscriptions();
  if (subs.has(eventId)) {
    subs.delete(eventId);
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(Array.from(subs)));
    return false;
  }
  subs.add(eventId);
  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(Array.from(subs)));
  return true;
}
