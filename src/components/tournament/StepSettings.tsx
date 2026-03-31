import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../../lib/constants';
import { TOGGLES, ADVANCED_SETTINGS, clamp } from './wizard-data';
import type { Club } from '../../lib/types';

// ── Props ────────────────────────────────────────────────────────────────────

interface StepSettingsProps {
  players: number;
  onPlayersChange: (v: number) => void;
  courts: number;
  onCourtsChange: (v: number) => void;
  points: number;
  onPointsChange: (v: number) => void;
  time: number;
  onTimeChange: (v: number) => void;
  toggles: Record<string, boolean>;
  onToggle: (key: string, value: boolean) => void;
  selectedVenue: Club | null;
  onOpenVenueModal: () => void;
  onClearVenue: () => void;
  venueModalVisible: boolean;
  venueResults: Club[];
  venueSearch: string;
  onVenueSearch: (q: string) => void;
  onSelectVenue: (club: Club) => void;
  onCloseVenueModal: () => void;
  advancedExpanded: boolean;
  onToggleAdvanced: () => void;
  advancedValues: Record<string, string>;
  onAdvancedValueChange: (key: string, value: string) => void;
  roundLimit: number;
  onRoundLimitChange: (v: number) => void;
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function StepSettings({
  players,
  onPlayersChange,
  courts,
  onCourtsChange,
  points,
  onPointsChange,
  time,
  onTimeChange,
  toggles,
  onToggle,
  selectedVenue,
  onOpenVenueModal,
  onClearVenue,
  venueModalVisible,
  venueResults,
  venueSearch,
  onVenueSearch,
  onSelectVenue,
  onCloseVenueModal,
  advancedExpanded,
  onToggleAdvanced,
  advancedValues,
  onAdvancedValueChange,
  roundLimit,
  onRoundLimitChange,
}: StepSettingsProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Settings Grid */}
      <SectionHeader title="Settings" />
      <View style={styles.settingsGrid}>
        <View style={styles.settingsRow}>
          <SettingCard
            label="PLAYERS"
            value={players}
            unit="max"
            onDecrement={() => onPlayersChange(clamp(players - 1, 4, 16))}
            onIncrement={() => onPlayersChange(clamp(players + 1, 4, 16))}
            testIDMinus="btn-players-minus"
            testIDPlus="btn-players-plus"
          />
          <SettingCard
            label="COURTS"
            value={courts}
            unit="available"
            onDecrement={() => onCourtsChange(clamp(courts - 1, 1, 6))}
            onIncrement={() => onCourtsChange(clamp(courts + 1, 1, 6))}
            testIDMinus="btn-courts-minus"
            testIDPlus="btn-courts-plus"
          />
        </View>
        <View style={styles.settingsRow}>
          <SettingCard
            label="POINTS"
            value={points}
            unit="per match"
            onDecrement={() => onPointsChange(clamp(points - 3, 11, 32))}
            onIncrement={() => onPointsChange(clamp(points + 3, 11, 32))}
            testIDMinus="btn-points-minus"
            testIDPlus="btn-points-plus"
          />
          <SettingCard
            label="TIME"
            value={time}
            unit="min / round"
            onDecrement={() => onTimeChange(clamp(time - 1, 5, 25))}
            onIncrement={() => onTimeChange(clamp(time + 1, 5, 25))}
            testIDMinus="btn-time-minus"
            testIDPlus="btn-time-plus"
          />
        </View>
      </View>

      <Divider />

      {/* Venue */}
      <View style={styles.sectionWrap}>
        <Text style={styles.inputLabel}>VENUE (OPTIONAL)</Text>
        <VenueCard
          venue={selectedVenue}
          onPress={onOpenVenueModal}
          onClear={onClearVenue}
        />
      </View>

      <Divider />

      {/* Options / Toggles */}
      <SectionHeader title="Options" />
      <View style={styles.togglesSection}>
        {TOGGLES.map((t, i) => (
          <ToggleRow
            key={t.key}
            label={t.label}
            hint={t.hint}
            value={toggles[t.key]}
            onToggle={(v) => onToggle(t.key, v)}
            isLast={i === TOGGLES.length - 1}
          />
        ))}
      </View>

      {/* Advanced Settings */}
      <AdvancedSettingsDrawer
        expanded={advancedExpanded}
        onToggle={onToggleAdvanced}
        advancedValues={advancedValues}
        onValueChange={onAdvancedValueChange}
        roundLimit={roundLimit}
        onRoundLimitChange={onRoundLimitChange}
      />

      {/* Venue Search Modal */}
      <VenueSearchModal
        visible={venueModalVisible}
        clubs={venueResults}
        searchQuery={venueSearch}
        onSearchChange={onVenueSearch}
        onSelect={onSelectVenue}
        onClose={onCloseVenueModal}
      />

      {/* Bottom padding */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingCard({
  label,
  value,
  unit,
  onDecrement,
  onIncrement,
  testIDMinus,
  testIDPlus,
}: {
  label: string;
  value: number;
  unit: string;
  onDecrement: () => void;
  onIncrement: () => void;
  testIDMinus?: string;
  testIDPlus?: string;
}) {
  return (
    <View style={styles.settingCard}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
      <Text style={styles.settingUnit}>{unit}</Text>
      <View style={styles.settingControls}>
        <Pressable
          testID={testIDMinus}
          style={styles.stepperBtn}
          onPress={() => {
            Haptics.selectionAsync();
            onDecrement();
          }}
        >
          <Ionicons name="remove" size={18} color={Colors.textSecondary} />
        </Pressable>
        <Pressable
          testID={testIDPlus}
          style={styles.stepperBtn}
          onPress={() => {
            Haptics.selectionAsync();
            onIncrement();
          }}
        >
          <Ionicons name="add" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onToggle,
  isLast,
}: {
  label: string;
  hint: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  isLast: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !isLast && styles.toggleRowBorder]}>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.selectionAsync();
          onToggle(v);
        }}
        trackColor={{ false: Colors.surface, true: Colors.opticYellow }}
        thumbColor={value ? Colors.darkBg : Colors.textSecondary}
        ios_backgroundColor={Colors.surface}
      />
    </View>
  );
}

function VenueCard({
  venue,
  onPress,
  onClear,
}: {
  venue: Club | null;
  onPress: () => void;
  onClear: () => void;
}) {
  return (
    <Pressable
      testID="btn-add-venue"
      style={styles.venueCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={styles.venueIconWrap}>
        <Ionicons
          name={venue ? 'location' : 'location-outline'}
          size={22}
          color={venue ? Colors.aquaGreen : Colors.textMuted}
        />
      </View>
      <View style={styles.venueTextWrap}>
        {venue ? (
          <>
            <Text style={styles.venueName}>{venue.name}</Text>
            <Text style={styles.venueAddress} numberOfLines={1}>
              {venue.address ?? venue.city ?? 'No address'}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.venuePlaceholder}>Add Venue</Text>
            <Text style={styles.venueHint}>Optional — link a padel club</Text>
          </>
        )}
      </View>
      {venue ? (
        <Pressable
          style={styles.venueClearBtn}
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClear();
          }}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      )}
    </Pressable>
  );
}

function VenueSearchModal({
  visible,
  clubs,
  searchQuery,
  onSearchChange,
  onSelect,
  onClose,
}: {
  visible: boolean;
  clubs: Club[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (club: Club) => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.venueModalOverlay}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.venueModal}>
          <View style={styles.venueModalHeader}>
            <Text style={styles.venueModalTitle}>Select Venue</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <TextInput
            testID="input-venue-search"
            style={styles.venueSearchInput}
            placeholder="Search clubs..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoFocus
          />
          <ScrollView style={styles.venueList}>
            {clubs.length === 0 && (
              <Text style={styles.venueEmptyText}>
                {searchQuery ? 'No clubs found' : 'Type to search...'}
              </Text>
            )}
            {clubs.map((club) => (
              <Pressable
                key={club.id}
                style={styles.venueListItem}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(club);
                }}
              >
                <Ionicons name="location" size={18} color={Colors.aquaGreen} />
                <View style={styles.venueListItemText}>
                  <Text style={styles.venueListItemName}>{club.name}</Text>
                  <Text style={styles.venueListItemAddr} numberOfLines={1}>
                    {club.address ?? club.city ?? ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function AdvancedSettingsDrawer({
  expanded,
  onToggle,
  advancedValues,
  onValueChange,
  roundLimit,
  onRoundLimitChange,
}: {
  expanded: boolean;
  onToggle: () => void;
  advancedValues: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  roundLimit: number;
  onRoundLimitChange: (v: number) => void;
}) {
  const rotation = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    rotation.value = withTiming(expanded ? 180 : 0, { duration: 200 });
  }, [expanded, rotation]);

  return (
    <View style={styles.advancedWrap}>
      <Pressable
        style={styles.advancedHeader}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
      >
        <View style={styles.advancedHeaderLeft}>
          <Ionicons name="settings-outline" size={18} color={Colors.textDim} />
          <Text style={styles.advancedHeaderTitle}>Advanced Settings</Text>
        </View>
        <Animated.View style={animStyle}>
          <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.advancedBody}>
          {/* Round Limit */}
          <View style={styles.advancedRow}>
            <View style={styles.advancedRowText}>
              <Text style={styles.advancedRowLabel}>Round Limit</Text>
              <Text style={styles.advancedRowHint}>0 = play until all rounds complete</Text>
            </View>
            <View style={styles.advancedStepper}>
              <Pressable
                style={styles.advancedStepBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  onRoundLimitChange(Math.max(0, roundLimit - 1));
                }}
              >
                <Ionicons name="remove" size={14} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.advancedStepValue}>{roundLimit || 'Auto'}</Text>
              <Pressable
                style={styles.advancedStepBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  onRoundLimitChange(Math.min(12, roundLimit + 1));
                }}
              >
                <Ionicons name="add" size={14} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Pill Options */}
          {ADVANCED_SETTINGS.map((setting) => (
            <View key={setting.key} style={styles.advancedRow}>
              <View style={styles.advancedRowText}>
                <Text style={styles.advancedRowLabel}>{setting.label}</Text>
                <Text style={styles.advancedRowHint}>{setting.hint}</Text>
              </View>
              <View style={styles.pillRow}>
                {setting.options.map((opt) => {
                  const active = advancedValues[setting.key] === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        onValueChange(setting.key, opt.id);
                      }}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  bottomSpacer: {
    height: 16,
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[5],
    marginVertical: Spacing[4],
  },

  // Section wrapper
  sectionWrap: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
  },
  inputLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing[2],
  },

  // Settings Grid
  settingsGrid: {
    paddingHorizontal: Spacing[5],
    gap: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  settingCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.surface,
    borderRadius: Radius.md + 2,
    padding: Spacing[3],
    alignItems: 'center',
  },
  settingLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing[2],
  },
  settingValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 28,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  settingUnit: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  settingControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing[2],
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Toggles
  togglesSection: {
    paddingHorizontal: Spacing[5],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  toggleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,41,59,0.6)',
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: Spacing[3],
  },
  toggleLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  toggleHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Venue Card
  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[4],
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  venueIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,207,193,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueTextWrap: {
    flex: 1,
  },
  venueName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  venueAddress: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    marginTop: 2,
  },
  venuePlaceholder: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textDim,
  },
  venueHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  venueClearBtn: {
    padding: Spacing[2],
  },

  // Venue Search Modal
  venueModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  venueModal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '70%',
    paddingBottom: Spacing[8],
  },
  venueModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  venueModalTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  venueSearchInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[4],
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  venueList: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
  },
  venueEmptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing[8],
  },
  venueListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  venueListItemText: {
    flex: 1,
    gap: 2,
  },
  venueListItemName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  venueListItemAddr: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
  },

  // Advanced Settings Drawer
  advancedWrap: {
    marginHorizontal: Spacing[5],
    marginTop: Spacing[4],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
  },
  advancedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  advancedHeaderTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  advancedBody: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[5],
  },
  advancedRow: {
    gap: Spacing[2],
  },
  advancedRowText: {
    gap: 2,
  },
  advancedRowLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  advancedRowHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  advancedStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginTop: Spacing[2],
  },
  advancedStepBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  advancedStepValue: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[2],
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: 'rgba(204,255,0,0.12)',
    borderColor: Colors.opticYellow,
  },
  pillText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
  },
  pillTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.opticYellow,
  },
});
