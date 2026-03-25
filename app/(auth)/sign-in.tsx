import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../src/lib/supabase';
import { Colors, Fonts, AppConfig } from '../../src/lib/constants';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { SmashdLogo } from '../../src/components/ui/SmashdLogo';
import { SmashdWordmark } from '../../src/components/ui/SmashdWordmark';
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

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) {
          Alert.alert('Sign in failed', error.message);
        }
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', e.message ?? 'Apple sign-in failed');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'smashd://auth/callback',
        },
      });
      if (error) {
        Alert.alert('Sign in failed', error.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Google sign-in failed');
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert('Sign in failed', error.message);
      } else if (!data.session) {
        // Edge case: Supabase returned success but no session
        Alert.alert('Sign in failed', 'No session returned. Please try again.');
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
        <Animated.View entering={FadeInDown.springify()} style={styles.branding}>
          <SmashdLogo size={80} />
          <SmashdWordmark size={42} />
          <Text style={styles.tagline}>{AppConfig.tagline}</Text>
        </Animated.View>

        {/* Email Sign In */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.form}>
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
        </Animated.View>

        {/* Divider + Social Sign In */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ gap: 16 }}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          <Button
            title="Continue with Google"
            onPress={handleGoogleSignIn}
            variant="outline"
            size="lg"
          />
        </Animated.View>

        {/* Forgot Password + Sign Up Link */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.forgotRow}>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleForgotPassword(); }} accessibilityRole="button" accessibilityLabel="Forgot password">
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </Pressable>
          </View>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(auth)/sign-up'); }} accessibilityRole="button" accessibilityLabel="Sign up for a new account">
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </View>
        </Animated.View>
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
  appleButton: {
    height: 52,
    width: '100%' as any,
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
