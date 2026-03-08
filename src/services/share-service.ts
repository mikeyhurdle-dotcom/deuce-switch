import { type RefObject } from 'react';
import { Alert, Platform } from 'react-native';
import type ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

/**
 * Capture a ViewShot ref to PNG and open the native share sheet.
 * Works for both ShareCard (tournament-level) and PlayerShareCard (personal).
 */
async function captureAndShare(
  viewRef: RefObject<ViewShot | null>,
  dialogTitle: string,
): Promise<void> {
  try {
    if (!viewRef.current?.capture) {
      Alert.alert('Error', 'Share card is not ready. Please try again.');
      return;
    }

    const uri = await viewRef.current.capture();

    if (Platform.OS === 'web') {
      Alert.alert('Sharing', 'Sharing is not supported on web.');
      return;
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Sharing', 'Sharing is not available on this device.');
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle,
    });
  } catch (err) {
    console.error('Share failed:', err);
    Alert.alert('Error', 'Something went wrong while sharing. Please try again.');
  }
}

/**
 * Share the full tournament results card (all standings).
 */
export async function shareResultsCard(
  viewRef: RefObject<ViewShot | null>,
): Promise<void> {
  return captureAndShare(viewRef, 'Share Tournament Results');
}

/**
 * Share the personal player results card (rank, points, stats).
 * This is the social acquisition hook — every share is free marketing.
 */
export async function sharePlayerCard(
  viewRef: RefObject<ViewShot | null>,
): Promise<void> {
  return captureAndShare(viewRef, 'Share My Results');
}
