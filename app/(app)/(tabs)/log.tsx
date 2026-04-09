import { Redirect } from 'expo-router';

// This screen is never shown — the tab press is intercepted to open the Log Match
// bottom sheet (Phase 2). If somehow navigated to directly, redirect to Home.
export default function LogRedirect() {
  return <Redirect href="/(app)/(tabs)/home" />;
}
