import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/providers/AuthProvider';
import { supabase } from '../../src/lib/supabase';
import { Colors, Fonts, Spacing, Radius } from '../../src/lib/constants';
import { AnimatedPressable, useSpringPress } from '../../src/hooks/useSpringPress';

// ── Types ────────────────────────────────────────────────────────────────────
type IconName = keyof typeof Ionicons.glyphMap;

// ── Profile Card ─────────────────────────────────────────────────────────────
function ProfileCard() {
  const { profile, user } = useAuth();
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Player';
  const email = user?.email ?? '';
  const initials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Animated.View entering={FadeInDown.duration(350).damping(18)} style={styles.profileCard}>
      <View style={styles.avatarRing}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileEmail}>{email}</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(app)/(tabs)/profile');
          }}
        >
          <Text style={styles.profileEdit}>Edit Profile →</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

// ── Chevron Row ──────────────────────────────────────────────────────────────
function ChevronRow({
  icon,
  iconColor,
  iconBg,
  label,
  sub,
  onPress,
  destructive,
}: {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  label: string;
  sub?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();

  return (
    <AnimatedPressable
      style={[styles.settingRow, animatedStyle]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text
          style={[
            styles.settingLabel,
            destructive && { color: Colors.error },
          ]}
        >
          {label}
        </Text>
        {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
    </AnimatedPressable>
  );
}

// ── Info Row (non-tappable, just displays a value) ──────────────────────────
function InfoRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
}: {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingSub}>{value}</Text>
      </View>
    </View>
  );
}

// ── Linked Account Row ───────────────────────────────────────────────────────
function LinkedRow({
  logo,
  logoBg,
  name,
  status,
  statusColor,
  btnLabel,
}: {
  logo: string;
  logoBg: string;
  name: string;
  status: string;
  statusColor: string;
  btnLabel: string;
}) {
  return (
    <View style={styles.linkedRow}>
      <View style={[styles.linkedLogo, { backgroundColor: logoBg }]}>
        <Text style={styles.linkedLogoText}>{logo}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{name}</Text>
        <Text style={[styles.linkedStatus, { color: statusColor }]}>
          {status}
        </Text>
      </View>
      <View style={[styles.linkBtn, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.linkBtnText, { color: Colors.textMuted }]}>{btnLabel}</Text>
      </View>
    </View>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return <View style={styles.divider} />;
}

// ── Logout Button ───────────────────────────────────────────────────────────
function LogoutButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();
  return (
    <AnimatedPressable
      style={[styles.logoutBtn, animatedStyle]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Log out"
    >
      <Text style={styles.logoutBtnText}>Log Out</Text>
    </AnimatedPressable>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email found for your account.');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Check Your Email',
          `We've sent a password reset link to ${user.email}. Follow the link to set a new password.`,
        );
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.\n\nTo proceed, please email us at support@playsmashd.com and we will process your request.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          style: 'destructive',
          onPress: () => Linking.openURL('mailto:support@playsmashd.com?subject=Delete%20My%20Account'),
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Settings',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontFamily: Fonts.bodySemiBold,
            fontSize: 18,
          },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <ProfileCard />

          {/* ── Linked Accounts ────────────────── */}
          <SectionLabel title="Linked Accounts" />

          <LinkedRow
            logo="PT"
            logoBg="#00C853"
            name="Playtomic"
            status="Coming Soon"
            statusColor={Colors.textMuted}
            btnLabel="Coming Soon"
          />

          <Divider />

          {/* ── Privacy & Account ─────────────── */}
          <SectionLabel title="Account" />

          <InfoRow
            icon="eye"
            iconColor={Colors.violet}
            iconBg="rgba(123,47,190,0.08)"
            label="Profile Visibility"
            value="Public — other players can find you"
          />
          <ChevronRow
            icon="lock-closed"
            iconColor={Colors.warning}
            iconBg="rgba(245,158,11,0.1)"
            label="Change Password"
            sub={changingPassword ? 'Sending reset email...' : 'Send a password reset email'}
            onPress={handleChangePassword}
          />
          <ChevronRow
            icon="trash"
            iconColor={Colors.error}
            iconBg="rgba(239,68,68,0.08)"
            label="Delete Account"
            sub="Permanently delete your data"
            onPress={handleDeleteAccount}
            destructive
          />

          <Divider />

          {/* ── About ──────────────────────────── */}
          <SectionLabel title="About" />

          <ChevronRow
            icon="shield-checkmark"
            iconColor="#3B82F6"
            iconBg="rgba(59,130,246,0.1)"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://playsmashd.com/privacy')}
          />
          <ChevronRow
            icon="chatbubble-ellipses"
            iconColor={Colors.success}
            iconBg="rgba(34,197,94,0.1)"
            label="Help & Support"
            sub="support@playsmashd.com"
            onPress={() => Linking.openURL('mailto:support@playsmashd.com')}
          />

          {/* ── Logout ─────────────────────────── */}
          <LogoutButton onPress={handleSignOut} />

          {/* ── App Info ────────────────────────── */}
          <Text style={styles.appInfo}>
            Smashd v1.0.0{'\n'}Every point counts.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  container: {
    paddingBottom: Spacing[10],
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[3],
    marginBottom: Spacing[5],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing[5],
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.opticYellow,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  profileEdit: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.opticYellow,
    marginTop: 4,
  },

  // Section Label
  sectionLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },

  // Setting Rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[5],
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  settingSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Linked Accounts
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[5],
  },
  linkedLogo: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedLogoText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  linkedStatus: {
    fontFamily: Fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  linkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.sm + 2,
  },
  linkBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing[5],
    marginVertical: Spacing[2],
  },

  // Logout
  logoutBtn: {
    marginHorizontal: Spacing[5],
    marginTop: Spacing[6],
    paddingVertical: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  logoutBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.error,
  },

  // App Info
  appInfo: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingVertical: Spacing[4],
  },
});
