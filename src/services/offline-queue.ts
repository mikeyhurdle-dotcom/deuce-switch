/**
 * Offline Score Queue
 *
 * Queues score submissions when the device is offline.
 * Automatically flushes when connectivity is restored.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitScore, type ScoreMetadata } from './tournament-service';

const QUEUE_KEY = 'smashd_offline_score_queue';

const MAX_RETRIES = 5;
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

type QueuedScore = {
  matchId: string;
  teamAScore: number;
  teamBScore: number;
  metadata?: ScoreMetadata;
  queuedAt: string;
  retries?: number;
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
  metadata?: ScoreMetadata,
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    matchId,
    teamAScore,
    teamBScore,
    metadata,
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

  const now = Date.now();
  const remaining: QueuedScore[] = [];
  let submitted = 0;

  for (const item of queue) {
    // Drop items that are too old — scores from days ago are stale
    const age = now - new Date(item.queuedAt).getTime();
    if (age > MAX_AGE_MS) {
      console.warn(`[offline-queue] Dropping stale score for match ${item.matchId} (age: ${Math.round(age / 3600000)}h)`);
      continue;
    }

    // Drop items that have exceeded max retries
    const retries = item.retries ?? 0;
    if (retries >= MAX_RETRIES) {
      console.warn(`[offline-queue] Dropping score for match ${item.matchId} after ${retries} retries`);
      continue;
    }

    try {
      await submitScore(item.matchId, item.teamAScore, item.teamBScore, item.metadata);
      submitted++;
    } catch {
      // Keep failed items with incremented retry count
      remaining.push({ ...item, retries: retries + 1 });
    }
  }

  await saveQueue(remaining);
  return submitted;
}

/** Clear the queue entirely (e.g. on sign out). */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
