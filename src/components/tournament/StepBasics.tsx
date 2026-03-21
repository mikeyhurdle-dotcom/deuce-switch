import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '../../lib/constants';
import { FORMATS, type TournamentFormat } from './wizard-data';

// ── Props ────────────────────────────────────────────────────────────────────

interface StepBasicsProps {
  name: string;
  onNameChange: (v: string) => void;
  nameError: string | null;
  selectedFormat: number;
  onSelectFormat: (index: number) => void;
  bannerUri: string | null;
  onPickBanner: () => void;
  onRemoveBanner: () => void;
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function StepBasics({
  name,
  onNameChange,
  nameError,
  selectedFormat,
  onSelectFormat,
  bannerUri,
  onPickBanner,
  onRemoveBanner,
}: StepBasicsProps) {
  const format = FORMATS[selectedFormat];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <HeroSection />

      {/* Tournament Name */}
      <View style={styles.nameWrap}>
        <Text style={styles.inputLabel}>TOURNAMENT NAME</Text>
        <TextInput
          style={[styles.textInput, nameError ? styles.textInputError : null]}
          placeholder="e.g. Sunday Smash"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
          returnKeyType="done"
        />
        {nameError ? (
          <Text style={styles.errorText}>{nameError}</Text>
        ) : null}
      </View>

      {/* Banner Upload */}
      <View style={styles.sectionWrap}>
        <BannerUpload
          bannerUri={bannerUri}
          onPickBanner={onPickBanner}
          onRemoveBanner={onRemoveBanner}
        />
      </View>

      <Divider />

      {/* Format Cards */}
      <SectionHeader title="Choose Format" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.formatScroll}
      >
        {FORMATS.map((f, i) => (
          <FormatCard
            key={f.id}
            format={f}
            selected={i === selectedFormat}
            onSelect={() => onSelectFormat(i)}
          />
        ))}
      </ScrollView>

      {/* Format Info */}
      <FormatInfoPanel key={format.id} format={format} />

      {/* Bottom padding */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.hero}>
      <View style={styles.heroIconWrap}>
        <Ionicons name="trophy" size={36} color={Colors.opticYellow} />
      </View>
      <Text style={styles.heroTitle}>{'Set Up Your\nTournament'}</Text>
      <Text style={styles.heroSub}>
        Pick a format, set the rules, and invite your crew. Takes 30 seconds.
      </Text>
    </Animated.View>
  );
}

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

function FormatCard({
  format,
  selected,
  onSelect,
}: {
  format: TournamentFormat;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = format.comingSoon === true;
  return (
    <Pressable
      style={[
        styles.formatCard,
        selected && styles.formatCardSelected,
        disabled && { opacity: 0.45 },
      ]}
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync();
        onSelect();
      }}
    >
      {selected && !disabled && (
        <View style={styles.cardCheck}>
          <Ionicons name="checkmark" size={12} color={Colors.darkBg} />
        </View>
      )}
      <View style={[styles.formatIconWrap, { backgroundColor: format.tagBg }]}>
        <Ionicons name={format.icon} size={24} color={disabled ? Colors.textMuted : format.iconColor} />
      </View>
      <Text style={styles.formatName}>{format.name}</Text>
      <Text style={styles.formatDesc}>{format.desc}</Text>
      <View style={[styles.formatTag, { backgroundColor: format.tagBg }]}>
        <Text style={[styles.formatTagText, { color: format.tagColor }]}>
          {format.tag}
        </Text>
      </View>
    </Pressable>
  );
}

function FormatInfoPanel({ format }: { format: TournamentFormat }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.infoPanel}>
      <Text style={styles.infoPanelTitle}>{format.name}</Text>
      <Text style={styles.infoPanelBody}>{format.info}</Text>
      <View style={styles.infoPanelStats}>
        {format.stats.map((s, i) => (
          <Text key={i} style={styles.infoPanelStat}>
            <Text style={styles.infoPanelStatBold}>{s.value}</Text> {s.label}
          </Text>
        ))}
      </View>
    </Animated.View>
  );
}

function BannerUpload({
  bannerUri,
  onPickBanner,
  onRemoveBanner,
}: {
  bannerUri: string | null;
  onPickBanner: () => void;
  onRemoveBanner: () => void;
}) {
  if (bannerUri) {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bannerPreview}>
        <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
        <View style={styles.bannerOverlay}>
          <Pressable
            style={styles.bannerChangeBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPickBanner();
            }}
          >
            <Ionicons name="camera" size={16} color={Colors.textPrimary} />
            <Text style={styles.bannerChangeBtnText}>Change</Text>
          </Pressable>
          <Pressable
            style={styles.bannerRemoveBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRemoveBanner();
            }}
          >
            <Ionicons name="close" size={16} color={Colors.error} />
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Pressable
      style={styles.bannerPlaceholder}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPickBanner();
      }}
    >
      <View style={styles.bannerIconWrap}>
        <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
      </View>
      <Text style={styles.bannerPlaceholderTitle}>Add Banner Image</Text>
      <Text style={styles.bannerPlaceholderHint}>Optional — gives your event a custom look</Text>
    </Pressable>
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
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(204,255,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
  },
  heroTitle: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 32,
  },
  heroSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing[2],
    maxWidth: 280,
  },

  // Name Input
  nameWrap: {
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[5],
  },
  inputLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing[2],
  },
  textInput: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.surface,
    borderRadius: Radius.md + 2,
    paddingVertical: 14,
    paddingHorizontal: Spacing[4],
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  textInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing[1],
    paddingLeft: Spacing[1],
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

  // Format Cards
  formatScroll: {
    paddingHorizontal: Spacing[5],
    gap: 12,
    paddingBottom: Spacing[4],
  },
  formatCard: {
    width: 150,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.surface,
    borderRadius: 18,
    padding: Spacing[4],
    alignItems: 'center',
  },
  formatCardSelected: {
    borderColor: Colors.opticYellow,
    backgroundColor: 'rgba(204,255,0,0.04)',
  },
  cardCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.opticYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  formatName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  formatDesc: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: Spacing[2],
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

  // Format Info Panel
  infoPanel: {
    marginHorizontal: Spacing[5],
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: Colors.opticYellow,
    borderRadius: Radius.md,
    padding: Spacing[3],
  },
  infoPanelTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.opticYellow,
    marginBottom: 4,
  },
  infoPanelBody: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 19,
  },
  infoPanelStats: {
    flexDirection: 'row',
    gap: Spacing[4],
    marginTop: Spacing[2],
  },
  infoPanelStat: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  infoPanelStatBold: {
    fontFamily: Fonts.bodyBold,
    color: Colors.textPrimary,
  },

  // Banner Upload
  bannerPreview: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    height: 180,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing[2],
    padding: Spacing[3],
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bannerChangeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  bannerChangeBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  bannerRemoveBtn: {
    backgroundColor: 'rgba(239,68,68,0.25)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  bannerPlaceholder: {
    height: 120,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(204,255,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPlaceholderTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textDim,
  },
  bannerPlaceholderHint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
});
