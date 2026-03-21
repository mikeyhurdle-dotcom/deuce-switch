import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';
import { Colors } from '../../src/lib/constants';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  // Drive post-login navigation from here. sign-in.tsx and sign-up.tsx both
  // rely on this — neither navigates manually. When the session becomes
  // non-null (successful sign-in / sign-up), this layout re-renders and
  // Expo Router picks up the Redirect. Guard with !loading to avoid a flicker
  // when a persisted session is being restored on app relaunch.
  if (!loading && session) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.darkBg },
        animation: 'fade',
      }}
    />
  );
}
