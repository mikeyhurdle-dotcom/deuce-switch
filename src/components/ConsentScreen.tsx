/**
 * ConsentScreen — First-Open Privacy Consent
 *
 * Shown once on first app open before any other content.
 * Explains what data is collected and links to the privacy policy.
 * Acceptance stored in AsyncStorage — only shown once.
 */

import { useState } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius } from '../lib/constants';
import { Button } from './ui/Button';

type ConsentScreenProps = {
  onAccept: () => void;
};

export function ConsentScreen({ onAccept }: ConsentScreenProps) {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://playsmashd.com/privacy');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.emoji}>🎾</Text>
          <Text style={styles.title}>Welcome to Smashd</Text>
          <Text style={styles.subtitle}>The Community Hub for Padel</Text>
        </View>

        {/* Data Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>YOUR DATA</Text>
          <Text style={styles.infoText}>
            Smashd collects and stores the following to power your tournament
            experience:
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Your name and profile information
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Match history and tournament results
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Leaderboard scores and rankings
              </Text>
            </View>
          </View>

          <Text style={styles.infoFooter}>
            We never sell your data. Your information is used solely to provide
            the Smashd service.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="CONTINUE"
            onPress={handleAccept}
            loading={accepting}
            variant="primary"
            size="lg"
          />

          <Text style={styles.privacyLink} onPress={openPrivacyPolicy}>
            Read our Privacy Policy →
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.opticYellow,
    textAlign: 'center',
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  infoText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
    lineHeight: 22,
  },
  bulletList: {
    gap: 8,
    paddingLeft: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.opticYellow,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  infoFooter: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },
  actions: {
    gap: 16,
    alignItems: 'center',
  },
  privacyLink: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.aquaGreen,
    letterSpacing: 0.5,
  },
});
