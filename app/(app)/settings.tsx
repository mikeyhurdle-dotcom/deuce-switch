import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/providers/AuthProvider';
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

// ── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({
  icon,
  iconColor,
  iconBg,
  label,
  sub,
  value,
  onValueChange,
}: {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow} accessible accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={sub} accessibilityState={{ checked: value }}>
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.surfaceLight, true: Colors.opticYellow }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  );
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

// ── Linked Account Row ───────────────────────────────────────────────────────
function LinkedRow({
  logo,
  logoBg,
  name,
  status,
  statusColor,
  btnLabel,
  btnStyle,
}: {
  logo: string;
  logoBg: string;
  name: string;
  status: string;
  statusColor: string;
  btnLabel: string;
  btnStyle: 'connected' | 'coming' | 'link';
}) {
  const btnColors = {
    connected: {
      bg: 'rgba(34,197,94,0.1)',
      text: Colors.success,
    },
    coming: {
      bg: Colors.surface,
      text: Colors.textMuted,
    },
    link: {
      bg: 'rgba(204,255,0,0.08)',
      text: Colors.opticYellow,
    },
  };
  const { bg, text } = btnColors[btnStyle];

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
      <View style={[styles.linkBtn, { backgroundColor: bg }]}>
        <Text style={[styles.linkBtnText, { color: text }]}>{btnLabel}</Text>
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
  const { signOut } = useAuth();

  // Toggle states
  const [pushEnabled, setPushEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [tournamentAlerts, setTournamentAlerts] = useState(true);
  const [socialNotifs, setSocialNotifs] = useState(true);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const noop = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

          {/* ── Notifications ─────────────────── */}
          <SectionLabel title="Notifications" />

          <ToggleRow
            icon="notifications"
            iconColor={Colors.success}
            iconBg="rgba(34,197,94,0.1)"
            label="Push Notifications"
            sub="Tournament updates, results, invites"
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
          <ToggleRow
            icon="calendar"
            iconColor="#3B82F6"
            iconBg="rgba(59,130,246,0.1)"
            label="Game Reminders"
            sub="30 min before your booked games"
            value={remindersEnabled}
            onValueChange={setRemindersEnabled}
          />
          <ToggleRow
            icon="location"
            iconColor={Colors.aquaGreen}
            iconBg="rgba(0,207,193,0.08)"
            label="New Tournament Alerts"
            sub="Events near you or at your clubs"
            value={tournamentAlerts}
            onValueChange={setTournamentAlerts}
          />
          <ToggleRow
            icon="people"
            iconColor={Colors.violet}
            iconBg="rgba(123,47,190,0.08)"
            label="Social Notifications"
            sub="Likes, comments, friend activity"
            value={socialNotifs}
            onValueChange={setSocialNotifs}
          />
          <ChevronRow
            icon="mail"
            iconColor={Colors.warning}
            iconBg="rgba(245,158,11,0.1)"
            label="Email Digest"
            sub="Weekly summary · Wednesdays"
            onPress={noop}
          />

          <Divider />

          {/* ── Linked Accounts ────────────────── */}
          <SectionLabel title="Linked Accounts" />

          <LinkedRow
            logo="PT"
            logoBg="#00C853"
            name="Playtomic"
            status="Coming Soon"
            statusColor={Colors.textMuted}
            btnLabel="Coming Soon"
            btnStyle="coming"
          />
          <LinkedRow
            logo="FIP"
            logoBg="#1A237E"
            name="PadelFIP"
            status="Coming Soon"
            statusColor={Colors.textMuted}
            btnLabel="Coming Soon"
            btnStyle="coming"
          />
          <LinkedRow
            logo="G"
            logoBg="#4285F4"
            name="Google"
            status="Connected"
            statusColor={Colors.success}
            btnLabel="Linked"
            btnStyle="connected"
          />

          <Divider />

          {/* ── Gameplay ───────────────────────── */}
          <SectionLabel title="Gameplay" />

          <ChevronRow
            icon="location"
            iconColor={Colors.aquaGreen}
            iconBg="rgba(0,207,193,0.08)"
            label="Location & Clubs"
            sub="Dublin 4 · 3 favourite clubs"
            onPress={noop}
          />
          <ChevronRow
            icon="tennisball"
            iconColor={Colors.opticYellow}
            iconBg="rgba(204,255,0,0.08)"
            label="Player Preferences"
            sub="Right-hand · All-rounder"
            onPress={noop}
          />
          <ChevronRow
            icon="bar-chart"
            iconColor={Colors.violet}
            iconBg="rgba(123,47,190,0.08)"
            label="Stats Visibility"
            sub="Public — anyone can see your stats"
            onPress={noop}
          />

          <Divider />

          {/* ── Privacy & Security ─────────────── */}
          <SectionLabel title="Privacy & Security" />

          <ChevronRow
            icon="eye"
            iconColor={Colors.violet}
            iconBg="rgba(123,47,190,0.08)"
            label="Profile Visibility"
            sub="Public — anyone can find you"
            onPress={noop}
          />
          <ChevronRow
            icon="lock-closed"
            iconColor={Colors.warning}
            iconBg="rgba(245,158,11,0.1)"
            label="Change Password"
            onPress={noop}
          />
          <ChevronRow
            icon="trash"
            iconColor={Colors.error}
            iconBg="rgba(239,68,68,0.08)"
            label="Delete Account"
            sub="Permanently delete your data"
            onPress={noop}
            destructive
          />

          <Divider />

          {/* ── About ──────────────────────────── */}
          <SectionLabel title="About" />

          <ChevronRow
            icon="document-text"
            iconColor="#3B82F6"
            iconBg="rgba(59,130,246,0.1)"
            label="Terms of Service"
            onPress={noop}
          />
          <ChevronRow
            icon="shield-checkmark"
            iconColor="#3B82F6"
            iconBg="rgba(59,130,246,0.1)"
            label="Privacy Policy"
            onPress={noop}
          />
          <ChevronRow
            icon="chatbubble-ellipses"
            iconColor={Colors.success}
            iconBg="rgba(34,197,94,0.1)"
            label="Help & Support"
            onPress={noop}
          />

          {/* ── Logout ─────────────────────────── */}
          <LogoutButton onPress={handleSignOut} />

          {/* ── App Info ────────────────────────── */}
          <Text style={styles.appInfo}>
            Smashd v1.0.0 (Build 42){'\n'}Made with ⚡ in Dublin
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
  // settingRowPressed removed — spring press replaces opacity feedback
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
  // logoutBtnPressed removed — spring press replaces opacity feedback
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
