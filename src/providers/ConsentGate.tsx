/**
 * ConsentGate — First-Open Privacy Consent Gate
 *
 * Wraps the app content and shows the ConsentScreen if the user
 * hasn't accepted yet. Acceptance persisted in AsyncStorage.
 *
 * "The most important step a man can take. It's not the first one, is it?
 *  It's the next one. Always the next step, Dalinar."
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConsentScreen } from '../components/ConsentScreen';
import { Colors } from '../lib/constants';

const CONSENT_KEY = 'smashd_consent_accepted';

type ConsentGateProps = {
  children: React.ReactNode;
};

export function ConsentGate({ children }: ConsentGateProps) {
  const [checking, setChecking] = useState(true);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY)
      .then((value) => {
        setAccepted(value === 'true');
      })
      .catch(() => {
        // If read fails, show consent screen to be safe
        setAccepted(false);
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  const handleAccept = useCallback(async () => {
    await AsyncStorage.setItem(CONSENT_KEY, 'true');
    setAccepted(true);
  }, []);

  // Still checking AsyncStorage — show nothing (splash screen covers this)
  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.opticYellow} />
      </View>
    );
  }

  // Not accepted — show consent screen
  if (!accepted) {
    return <ConsentScreen onAccept={handleAccept} />;
  }

  // Accepted — render the app
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
