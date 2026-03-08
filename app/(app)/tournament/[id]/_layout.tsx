import { Stack } from 'expo-router';
import { Colors, Fonts } from '../../../../src/lib/constants';
import { ErrorBoundary } from '../../../../src/components/ErrorBoundary';

export default function TournamentLayout() {
  return (
    <ErrorBoundary fallbackMessage="Something went wrong with this tournament. Tap retry to reload.">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontFamily: Fonts.mono,
            fontSize: 14,
            letterSpacing: 2,
          } as any,
          contentStyle: { backgroundColor: Colors.darkBg },
          animation: 'slide_from_right',
        }}
      />
    </ErrorBoundary>
  );
}
