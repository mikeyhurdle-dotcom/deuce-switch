import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Alpha } from '../../lib/constants';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CountUp } from '../ui/CountUp';
import { updateAvatar } from '../../services/profile-service';
import type { Profile as ProfileType } from '../../lib/types';
import type { ProfileTab } from './types';

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numericValue);

  return (
    <View style={styles.statCard}>
      {isNumeric ? (
        <CountUp value={numericValue} style={[styles.statValue, { color }]} />
      ) : (
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function XPBar({
  current,
  max,
  level,
}: {
  current: number;
  max: number;
  level: number;
}) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <View style={styles.xpContainer}>
      <View style={styles.xpHeader}>
        <Text style={styles.xpLevel}>Level {level}</Text>
        <Text style={styles.xpNext}>Next: {max.toLocaleString()} XP</Text>
      </View>
      <View style={styles.xpTrack}>
        <LinearGradient
          colors={[Colors.aquaGreen, Colors.opticYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.xpFill, { width: `${pct}%` as any }]}
        />
      </View>
      <View style={styles.xpNumbers}>
        <Text style={styles.xpNum}>{current.toLocaleString()}</Text>
        <Text style={styles.xpNum}>{max.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const PROFILE_TAB_TEST_IDS: Record<ProfileTab, string> = {
  Overview: 'tab-profile-overview',
  Stats: 'tab-profile-stats',
  Feed: 'tab-profile-feed',
  History: 'tab-profile-history',
};

const PROFILE_TABS: ProfileTab[] = ['Overview', 'Stats', 'Feed', 'History'];

function TabSwitcher({
  active,
  onSelect,
}: {
  active: ProfileTab;
  onSelect: (t: ProfileTab) => void;
}) {
  return (
    <View style={styles.tabRow}>
      {PROFILE_TABS.map((tab) => (
        <Pressable
          key={tab}
          testID={PROFILE_TAB_TEST_IDS[tab]}
          style={[styles.tab, tab === active && styles.tabActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(tab);
          }}
        >
          <Text style={[styles.tabLabel, tab === active && styles.tabLabelActive]}>
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

type ProfileHeaderProps = {
  profile: ProfileType | null;
  user: { id: string; email?: string } | null;
  editing: boolean;
  setEditing: (v: boolean) => void;
  refreshProfile: () => Promise<void>;
  // Stat card data
  winRate: number | null;
  tournamentCount: number;
  recentTournamentCount: number;
  connectionCount: number;
  // Edit form state
  displayName: string;
  setDisplayName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  preferredPosition: 'left' | 'right' | 'both' | null;
  setPreferredPosition: (v: 'left' | 'right' | 'both' | null) => void;
  racketBrand: string;
  setRacketBrand: (v: string) => void;
  racketModel: string;
  setRacketModel: (v: string) => void;
  shoeBrand: string;
  setShoeBrand: (v: string) => void;
  shoeModel: string;
  setShoeModel: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  // Tab
  activeTab: ProfileTab;
  setActiveTab: (t: ProfileTab) => void;
};

export function ProfileHeader({
  profile,
  user,
  editing,
  setEditing,
  refreshProfile,
  winRate,
  tournamentCount,
  recentTournamentCount,
  connectionCount,
  displayName,
  setDisplayName,
  bio,
  setBio,
  preferredPosition,
  setPreferredPosition,
  racketBrand,
  setRacketBrand,
  racketModel,
  setRacketModel,
  shoeBrand,
  setShoeBrand,
  shoeModel,
  setShoeModel,
  saving,
  onSave,
  onCancel,
  activeTab,
  setActiveTab,
}: ProfileHeaderProps) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const initials = (profile?.display_name ?? user?.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasAvatar = !!profile?.game_face_url;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take Photo', 'Choose from Library', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) doAvatarUpload('camera');
          if (index === 1) doAvatarUpload('library');
        },
      );
    } else {
      Alert.alert('Change Photo', 'Choose a source', [
        { text: 'Take Photo', onPress: () => doAvatarUpload('camera') },
        { text: 'Choose from Library', onPress: () => doAvatarUpload('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const doAvatarUpload = async (source: 'camera' | 'library') => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const url = await updateAvatar(user.id, source);
      if (url) {
        await refreshProfile();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message ?? 'Could not update your photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  return (
    <>
      {/* ── Cover & Profile Header ────────────────────────────────── */}
      <View style={styles.coverArea}>
        <LinearGradient
          colors={['rgba(124,58,237,0.30)', Alpha.yellow10]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coverGradient}
        />

        {/* Action Buttons */}
        <View style={styles.headerActions}>
          <Pressable
            testID="btn-settings"
            style={styles.actionCircle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(app)/settings');
            }}
            hitSlop={8}
          >
            <Ionicons
              name="settings-outline"
              size={18}
              color={Colors.textSecondary}
            />
          </Pressable>
          <Pressable
            style={styles.actionCircle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleEdit();
            }}
            hitSlop={8}
          >
            <Ionicons
              name="pencil"
              size={16}
              color={Colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Avatar (tappable to change photo) */}
        <Pressable
          testID="btn-change-avatar"
          onPress={handleAvatarPress}
          disabled={uploadingAvatar}
          style={styles.avatarOuter}
        >
          {hasAvatar ? (
            <Image
              source={{ uri: profile!.game_face_url! }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {uploadingAvatar ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color={Colors.opticYellow} />
            </View>
          ) : (
            <View style={styles.avatarCameraBadge}>
              <Ionicons name="camera" size={12} color={Colors.textPrimary} />
            </View>
          )}
          {profile?.preferred_position && (
            <View style={styles.positionBadge}>
              <Text style={styles.positionBadgeText}>
                {profile.preferred_position.toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Name & Handle */}
        <Text style={styles.displayName}>
          {profile?.display_name ??
            user?.email?.split('@')[0] ??
            'Player'}
        </Text>
        {(profile?.username || profile?.bio) && (
          <Text style={styles.handle}>
            {profile?.username ? `@${profile.username}` : ''}
            {profile?.username && profile?.bio ? ' · ' : ''}
            {profile?.bio ?? ''}
          </Text>
        )}

        {/* Profile Meta */}
        <View style={styles.profileMeta}>
          <View style={styles.metaChip}>
            <Ionicons
              name="calendar-outline"
              size={11}
              color={Colors.textMuted}
            />
            <Text style={styles.metaChipText}>
              Joined{' '}
              {(profile as any)?.created_at
                ? formatDate((profile as any).created_at)
                : 'Recently'}
            </Text>
          </View>
          <View style={styles.metaSep} />
          <View style={styles.metaChip}>
            <Ionicons
              name="trophy-outline"
              size={11}
              color={Colors.textMuted}
            />
            <Text style={styles.metaChipText}>
              {recentTournamentCount} tournaments
            </Text>
          </View>
          <View style={styles.metaSep} />
          <Pressable
            style={styles.metaChip}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(app)/connections');
            }}
          >
            <Ionicons
              name="people-outline"
              size={11}
              color={Colors.textMuted}
            />
            <Text style={styles.metaChipText}>
              {connectionCount} connections
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Edit Mode ─────────────────────────────────────────────── */}
      {editing && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.editOverlay}
        >
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Edit Profile</Text>
            <Input
              label="DISPLAY NAME"
              placeholder="Your name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
            <Input
              label="BIO"
              placeholder="Tell us about your game..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
            />
            <View style={styles.posSection}>
              <Text style={styles.posLabel}>PREFERRED SIDE</Text>
              <View style={styles.posRow}>
                {(['left', 'right', 'both'] as const).map((pos) => (
                  <Pressable
                    key={pos}
                    style={[
                      styles.posChip,
                      preferredPosition === pos && styles.posChipActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPreferredPosition(pos);
                    }}
                  >
                    <Text
                      style={[
                        styles.posChipText,
                        preferredPosition === pos &&
                          styles.posChipTextActive,
                      ]}
                    >
                      {pos.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Equipment */}
            <View style={styles.posSection}>
              <Text style={styles.posLabel}>MY EQUIPMENT</Text>
              <View style={styles.equipRow}>
                <View style={styles.equipField}>
                  <Input
                    label="RACKET BRAND"
                    placeholder="e.g. Bullpadel"
                    value={racketBrand}
                    onChangeText={setRacketBrand}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.equipField}>
                  <Input
                    label="RACKET MODEL"
                    placeholder="e.g. Vertex 03"
                    value={racketModel}
                    onChangeText={setRacketModel}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <View style={styles.equipRow}>
                <View style={styles.equipField}>
                  <Input
                    label="SHOE BRAND"
                    placeholder="e.g. Asics"
                    value={shoeBrand}
                    onChangeText={setShoeBrand}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.equipField}>
                  <Input
                    label="SHOE MODEL"
                    placeholder="e.g. Gel-Padel Pro 5"
                    value={shoeModel}
                    onChangeText={setShoeModel}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            <View style={styles.editActions}>
              <Button
                title="CANCEL"
                onPress={onCancel}
                variant="outline"
                size="md"
              />
              <Button
                title="SAVE"
                onPress={onSave}
                loading={saving}
                variant="primary"
                size="md"
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      {!editing && (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsGrid}>
          <StatCard
            value={profile?.matches_played ?? 0}
            label="MATCHES"
            color={Colors.opticYellow}
          />
          <StatCard
            value={winRate !== null ? `${winRate}%` : '—'}
            label="WIN RATE"
            color={Colors.aquaGreen}
          />
          <StatCard
            value={tournamentCount}
            label="TOURNAMENTS"
            color={Colors.violetLight}
          />
          <View style={styles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="flame" size={16} color={Colors.warning} />
              <Text style={[styles.statValue, { color: Colors.warning }]}>
                {profile?.matches_played ? profile.matches_played : '—'}
              </Text>
            </View>
            <Text style={styles.statLabel}>GAMES</Text>
          </View>
        </Animated.View>
      )}

      {/* ── XP Bar ────────────────────────────────────────────────── */}
      {!editing && (
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <XPBar current={2450} max={3000} level={12} />
        </Animated.View>
      )}

      {/* ── Tab Switcher ──────────────────────────────────────────── */}
      {!editing && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <TabSwitcher active={activeTab} onSelect={setActiveTab} />
        </Animated.View>
      )}
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Cover & Header ────────────────────────────
  coverArea: {
    alignItems: 'center',
    paddingBottom: Spacing[4],
    position: 'relative',
  },
  coverGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    width: '100%',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    marginBottom: Spacing[4],
  },
  actionCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Avatar ──
  avatarOuter: {
    position: 'relative',
    marginBottom: Spacing[3],
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Colors.opticYellow,
    shadowColor: Colors.opticYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.opticYellow,
    shadowColor: Colors.opticYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarText: {
    fontFamily: Fonts.mono,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  positionBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.aquaGreen,
    letterSpacing: 0.5,
  },

  // ── Identity ──
  displayName: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  handle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing[8],
    marginBottom: Spacing[2],
  },

  // ── Profile Meta ──
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  },

  // ── Stat Cards ──
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing[5],
    marginTop: Spacing[5],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
  },
  statLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  // ── XP Bar ──
  xpContainer: {
    marginHorizontal: Spacing[5],
    marginTop: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[4],
    gap: 8,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLevel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  xpNext: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  xpTrack: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpNum: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Tabs ──
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing[5],
    marginTop: Spacing[5],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md - 2,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.surface,
  },
  tabLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.opticYellow,
  },

  // ── Edit Form ──
  editOverlay: {
    paddingHorizontal: Spacing[5],
    marginTop: Spacing[3],
  },
  editCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[5],
    gap: 16,
  },
  editTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  posSection: {
    gap: 8,
  },
  posLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  posRow: {
    flexDirection: 'row',
    gap: 8,
  },
  posChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  posChipActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow08,
  },
  posChipText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
  posChipTextActive: {
    color: Colors.opticYellow,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },

  // ── Equipment (edit form) ──
  equipRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  equipField: {
    flex: 1,
  },
});
