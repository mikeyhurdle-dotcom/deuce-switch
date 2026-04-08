import { createContext, useCallback, useContext, useRef } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors } from '../lib/constants';
import { LogMatchSheet } from '../components/log-match/LogMatchSheet';
import { ErrorBoundary } from '../components/ErrorBoundary';

type LogMatchContextValue = {
  openLogSheet: () => void;
};

const LogMatchContext = createContext<LogMatchContextValue>({
  openLogSheet: () => {},
});

export function useLogMatch() {
  return useContext(LogMatchContext);
}

export function LogMatchProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<BottomSheet>(null);

  const openLogSheet = useCallback(() => {
    sheetRef.current?.snapToIndex(0);
    AccessibilityInfo.announceForAccessibility('Log match options opened');
  }, []);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.close();
    AccessibilityInfo.announceForAccessibility('Log match options closed');
  }, []);

  return (
    <LogMatchContext.Provider value={{ openLogSheet }}>
      {children}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['55%', '80%']}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
        accessibilityViewIsModal
        accessibilityLabel="Log match options"
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.6}
          />
        )}
      >
        <BottomSheetScrollView>
          {/* PLA-478: wrap the sheet in an error boundary so a render
              crash inside the Log Match flow surfaces a retry UI
              instead of silently falling through to the tab redirect
              shim. Sentry capture is wired in the shared
              ErrorBoundary component. */}
          <ErrorBoundary fallbackMessage="Couldn't open Log Match. Dismiss and try again.">
            <LogMatchSheet onDismiss={handleDismiss} />
          </ErrorBoundary>
        </BottomSheetScrollView>
      </BottomSheet>
    </LogMatchContext.Provider>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    backgroundColor: Colors.surfaceLight,
    width: 40,
  },
});
