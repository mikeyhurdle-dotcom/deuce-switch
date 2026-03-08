import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { Colors } from '../../src/lib/constants';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay message="Loading…" />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
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
