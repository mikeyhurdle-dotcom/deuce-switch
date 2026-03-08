import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/lib/supabase';
import { Colors, Fonts, AppConfig } from '../../src/lib/constants';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { SmashdLogo } from '../../src/components/ui/SmashdLogo';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email address above, then tap Forgot password.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Check your inbox', 'We sent a password reset link to your email.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong');
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert('Sign in failed', error.message);
      }
      // AuthProvider handles the redirect via onAuthStateChange
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Branding */}
        <View style={styles.branding}>
          <SmashdLogo size={80} />
          <Text style={styles.logo}>{AppConfig.name}</Text>
          <Text style={styles.tagline}>{AppConfig.tagline}</Text>
        </View>

        {/* Email Sign In */}
        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
          <Button
            title="SIGN IN"
            onPress={handleEmailSignIn}
            loading={loading}
            variant="primary"
            size="lg"
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign In — placeholder, wired up in Step 2 */}
        <Button
          title="Continue with Google"
          onPress={() => Alert.alert('Coming soon', 'Google sign-in is being configured.')}
          variant="outline"
          size="lg"
        />

        {/* Forgot Password */}
        <View style={styles.forgotRow}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleForgotPassword(); }}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(auth)/sign-up'); }}>
            <Text style={styles.footerLink}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 32,
  },
  branding: {
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontFamily: Fonts.mono,
    fontSize: 42,
    color: Colors.opticYellow,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textDim,
  },
  form: {
    gap: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  forgotRow: {
    alignItems: 'center',
    marginTop: -16,
  },
  forgotLink: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textDim,
  },
  footerLink: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.opticYellow,
  },
});
