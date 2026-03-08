import { useCallback, useRef } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Fonts, Radius, AppConfig } from '../lib/constants';
import { Card } from './ui/Card';

type TournamentQRProps = {
  tournamentId: string;
  tournamentName: string;
  joinCode: string | null;
  /** Compact mode hides the join URL text and uses smaller QR */
  compact?: boolean;
};

/**
 * Branded QR code card for tournament sharing.
 * Encodes: {AppConfig.website}/join/{tournamentId}
 * High-contrast dark modules on white for reliable scanning in bright padel venues.
 */
export function TournamentQR({
  tournamentId,
  tournamentName,
  joinCode,
  compact = false,
}: TournamentQRProps) {
  const joinUrl = `${AppConfig.website}/join/${tournamentId}`;
  const qrSize = compact ? 140 : 200;

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const message = joinCode
        ? `Join "${tournamentName}" on Smashd!\n\nJoin code: ${joinCode}\nOr scan the QR / open: ${joinUrl}`
        : `Join "${tournamentName}" on Smashd!\n\n${joinUrl}`;

      await Share.share(
        Platform.OS === 'ios'
          ? { message, url: joinUrl }
          : { message, title: `Join ${tournamentName}` },
      );
    } catch {
      // User cancelled share — ignore
    }
  }, [tournamentName, joinCode, joinUrl]);

  const handleCopyUrl = useCallback(async () => {
    await Clipboard.setStringAsync(joinUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Join link copied to clipboard.');
  }, [joinUrl]);

  return (
    <Card>
      <View style={styles.container}>
        {!compact && (
          <Text style={styles.title}>SHARE TOURNAMENT</Text>
        )}

        {/* QR Code — white bg for high contrast scanning */}
        <View style={styles.qrWrapper}>
          <View style={[styles.qrBorder, { padding: compact ? 6 : 10 }]}>
            <QRCode
              value={joinUrl}
              size={qrSize}
              color="#000000"
              backgroundColor="#FFFFFF"
              ecl="M"
            />
          </View>
        </View>

        {/* Join URL */}
        {!compact && (
          <Pressable onPress={handleCopyUrl} style={styles.urlRow}>
            <Text style={styles.urlText} numberOfLines={1}>
              {joinUrl}
            </Text>
            <Text style={styles.copyHint}>tap to copy</Text>
          </Pressable>
        )}

        {/* Share Button */}
        <Pressable onPress={handleShare} style={styles.shareButton}>
          <Text style={styles.shareText}>SHARE INVITE</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  title: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  qrWrapper: {
    alignItems: 'center',
  },
  qrBorder: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 3,
    borderColor: Colors.opticYellow,
  },
  urlRow: {
    alignItems: 'center',
    gap: 2,
  },
  urlText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  copyHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  shareButton: {
    backgroundColor: Colors.violet,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  shareText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
