/**
 * Offline Score Queue
 *
 * Queues score submissions when the device is offline.
 * Automatically flushes when connectivity is restored.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitScore } from './tournament-service';

const QUEUE_KEY = 'smashd_offline_score_queue';

type QueuedScore = {
  matchId: string;
  teamAScore: number;
  teamBScore: number;
  queuedAt: string;
};

async function getQueue(): Promise<QueuedScore[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedScore[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Enqueue a score for later submission. */
export async function enqueueScore(
  matchId: string,
  teamAScore: number,
  teamBScore: number,
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    matchId,
    teamAScore,
    teamBScore,
    queuedAt: new Date().toISOString(),
  });
  await saveQueue(queue);
}

/** Returns the number of scores waiting in the queue. */
export async function pendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Flush all queued scores to Supabase.
 * Returns the count of successfully submitted scores.
 */
export async function flushQueue(): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedScore[] = [];
  let submitted = 0;

  for (const item of queue) {
    try {
      await submitScore(item.matchId, item.teamAScore, item.teamBScore);
      submitted++;
    } catch {
      // Keep failed items in the queue for the next flush
      remaining.push(item);
    }
  }

  await saveQueue(remaining);
  return submitted;
}

/** Clear the queue entirely (e.g. on sign out). */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
