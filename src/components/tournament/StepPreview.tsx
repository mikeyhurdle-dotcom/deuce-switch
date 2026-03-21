import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../../lib/constants';
import { FORMATS, TOGGLES, ADVANCED_SETTINGS } from './wizard-data';
import type { Club } from '../../lib/types';

// ── Props ────────────────────────────────────────────────────────────────────

interface StepPreviewProps {
  name: string;
  selectedFormat: number;
  bannerUri: string | null;
  players: number;
  courts: number;
  points: number;
  time: number;
  toggles: Record<string, boolean>;
  selectedVenue: Club | null;
  advancedValues: Record<string, string>;
  roundLimit: number;
  onEditStep: (step: 1 | 2) => void;
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function StepPreview({
  name,
  selectedFormat,
  bannerUri,
  players,
  courts,
  points,
  time,
  toggles,
  selectedVenue,
  advancedValues,
  roundLimit,
  onEditStep,
}: StepPreviewProps) {
  const format = FORMATS[selectedFormat];
  const activeToggles = TOGGLES.filter((t) => toggles[t.key]);
  const hasNonDefaultAdvanced =
    roundLimit !== 0 ||
    ADVANCED_SETTINGS.some(
      (s) => advancedValues[s.key] !== s.defaultValue,
    );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="eye" size={32} color={Colors.opticYellow} />
        </View>
        <Text style={styles.heroTitle}>Review & Create</Text>
        <Text style={styles.heroSub}>
          Check everything looks good, then hit create.
        </Text>
      </Animated.View>

      {/* Banner Preview */}
      <Animated.View entering={FadeIn.duration(200).delay(50)}>
        {bannerUri ? (
          <View style={styles.bannerWrap}>
            <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
            <View style={styles.bannerGradient}>
              <Text style={styles.bannerName} numberOfLines={1}>
                {name}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.nameCard}>
            <Text style={styles.nameCardText} numberOfLines={1}>
              {name}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Format Badge */}
      <Animated.View entering={FadeIn.duration(200).delay(100)} style={styles.section}>
        <SectionHeader title="Format" onEdit={() => onEditStep(1)} />
        <View style={styles.formatRow}>
          <View style={[styles.formatIconWrap, { backgroundColor: format.tagBg }]}>
            <Ionicons name={format.icon} size={20} color={format.iconColor} />
          </View>
          <View style={styles.formatTextWrap}>
            <Text style={styles.formatName}>{format.name}</Text>
            <Text style={styles.formatDesc}>{format.desc}</Text>
          </View>
          <View style={[styles.formatTag, { backgroundColor: format.tagBg }]}>
            <Text style={[styles.formatTagText, { color: format.tagColor }]}>
              {format.tag}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Settings Grid */}
      <Animated.View entering={FadeIn.duration(200).delay(150)} style={styles.section}>
        <SectionHeader title="Settings" onEdit={() => onEditStep(2)} />
        <View style={styles.statsGrid}>
          <StatCell icon="people" label="Players" value={String(players)} />
          <StatCell icon="grid" label="Courts" value={String(courts)} />
          <StatCell icon="tennisball" label="Points" value={String(points)} />
          <StatCell icon="time" label="Time" value={`${time} min`} />
        </View>
      </Animated.View>

      {/* Venue */}
      {selectedVenue && (
        <Animated.View entering={FadeIn.duration(200).delay(200)} style={styles.section}>
          <SectionHeader title="Venue" onEdit={() => onEditStep(2)} />
          <View style={styles.venueRow}>
            <View style={styles.venueIconWrap}>
              <Ionicons name="location" size={18} color={Colors.aquaGreen} />
            </View>
            <View style={styles.venueTextWrap}>
              <Text style={styles.venueName}>{selectedVenue.name}</Text>
              <Text style={styles.venueAddress} numberOfLines={1}>
                {selectedVenue.address ?? selectedVenue.city ?? 'No address'}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Active Toggles */}
      {activeToggles.length > 0 && (
        <Animated.View entering={FadeIn.duration(200).delay(250)} style={styles.section}>
          <SectionHeader title="Options" onEdit={() => onEditStep(2)} />
          <View style={styles.toggleList}>
            {activeToggles.map((t) => (
              <View key={t.key} style={styles.toggleItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.opticYellow} />
                <Text style={styles.toggleItemText}>{t.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Advanced Settings (only if non-default) */}
      {hasNonDefaultAdvanced && (
        <Animated.View entering={FadeIn.duration(200).delay(300)} style={styles.section}>
          <SectionHeader title="Advanced" onEdit={() => onEditStep(2)} />
          <View style={styles.advancedList}>
            {roundLimit > 0 && (
              <AdvancedRow label="Round Limit" value={String(roundLimit)} />
            )}
            {ADVANCED_SETTINGS.map((s) => {
              if (advancedValues[s.key] === s.defaultValue) return null;
              const opt = s.options.find((o) => o.id === advancedValues[s.key]);
              return (
                <AdvancedRow
                  key={s.key}
                  label={s.label}
                  value={opt?.label ?? advancedValues[s.key]}
                />
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Bottom padding */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  onEdit,
}: {
  title: string;
  onEdit: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable style={styles.editBtn} onPress={onEdit} hitSlop={8}>
        <Ionicons name="pencil" size={12} color={Colors.opticYellow} />
        <Text style={styles.editBtnText}>Edit</Text>
      </Pressable>
    </View>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCell}>
      <Ionicons name={icon} size={18} color={Colors.textMuted} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AdvancedRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.advancedRow}>
      <Text style={styles.advancedLabel}>{label}</Text>
      <View style={styles.advancedValuePill}>
        <Text style={styles.advancedValue}>{value}</Text>
      </View>
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

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
    paddingHorizontal: Spacing[5],
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(204,255,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
  },
  heroTitle: {
    fontFamily: Fonts.mono,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing[2],
    maxWidth: 260,
  },

  // Banner
  bannerWrap: {
    marginHorizontal: Spacing[5],
    borderRadius: Radius.lg,
    overflow: 'hidden',
    height: 160,
    marginBottom: Spacing[4],
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing[4],
    paddingTop: Spacing[8],
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bannerName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.textPrimary,
  },

  // Name card (no banner)
  nameCard: {
    marginHorizontal: Spacing[5],
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: Colors.opticYellow,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  nameCardText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.textPrimary,
  },

  // Sections
  section: {
    marginHorizontal: Spacing[5],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surface,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.opticYellow,
  },

  // Format Row
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  formatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatTextWrap: {
    flex: 1,
  },
  formatName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  formatDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    marginTop: 2,
  },
  formatTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  formatTagText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },

  // Stats Grid (2×2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  statCell: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing[3],
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Venue
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  venueIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
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

  // Toggle List
  toggleList: {
    gap: Spacing[2],
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  toggleItemText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Advanced
  advancedList: {
    gap: Spacing[2],
  },
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advancedLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
  },
  advancedValuePill: {
    backgroundColor: 'rgba(204,255,0,0.12)',
    paddingHorizontal: Spacing[3],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  advancedValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.opticYellow,
  },
});
