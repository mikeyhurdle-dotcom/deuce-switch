import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '../src/lib/constants';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.darkBg,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.aquaGreen,
  },
});
