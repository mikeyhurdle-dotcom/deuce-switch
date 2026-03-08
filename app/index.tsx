import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../src/providers/AuthProvider';
import { Colors } from '../src/lib/constants';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.opticYellow} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
