import React, { useState, useCallback } from 'react';
import {
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Native module not available (e.g. Expo Go) — banner picker disabled
}
import Animated, { FadeInRight, FadeInLeft } from 'react-native-reanimated';

import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/providers/AuthProvider';
import { Colors } from '../../../src/lib/constants';
import type { Club } from '../../../src/lib/types';

import {
  FORMATS,
  TOGGLES,
  ADVANCED_SETTINGS,
  generateJoinCode,
} from '../../../src/components/tournament/wizard-data';

import WizardProgressBar from '../../../src/components/tournament/WizardProgressBar';
import WizardNavBar from '../../../src/components/tournament/WizardNavBar';
import StepBasics from '../../../src/components/tournament/StepBasics';
import StepSettings from '../../../src/components/tournament/StepSettings';
import StepPreview from '../../../src/components/tournament/StepPreview';

// ── Main ─────────────────────────────────────────────────────────────────────

export default function CreateTournament() {
  const { user } = useAuth();

  // ── Wizard step ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // ── Step 1: Basics ───────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [bannerUri, setBannerUri] = useState<string | null>(null);

  // ── Step 2: Settings ─────────────────────────────────────────────────────
  const [players, setPlayers] = useState(8);
  const [courts, setCourts] = useState(2);
  const [points, setPoints] = useState(21);
  const [time, setTime] = useState(12);
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    TOGGLES.forEach((t) => (init[t.key] = t.defaultOn));
    return init;
  });
  const [selectedVenue, setSelectedVenue] = useState<Club | null>(null);
  const [venueModalVisible, setVenueModalVisible] = useState(false);
  const [venueSearch, setVenueSearch] = useState('');
  const [venueResults, setVenueResults] = useState<Club[]>([]);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [roundLimit, setRoundLimit] = useState(0);
  const [advancedValues, setAdvancedValues] = useState<Record<string, string>>(
    () => {
      const init: Record<string, string> = {};
      ADVANCED_SETTINGS.forEach((s) => (init[s.key] = s.defaultValue));
      return init;
    },
  );

  // ── Creation state ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleToggle = useCallback((key: string, value: boolean) => {
    Haptics.selectionAsync();
    setToggles((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handlePickBanner = useCallback(async () => {
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Image picker requires a native build. It will work in the installed app.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setBannerUri(result.assets[0].uri);
    }
  }, []);

  const handleVenueSearch = useCallback(async (query: string) => {
    setVenueSearch(query);
    if (query.length < 2) {
      setVenueResults([]);
      return;
    }
    // Search both clubs and scout_venues for maximum coverage
    const [clubsRes, scoutRes] = await Promise.all([
      supabase
        .from('clubs')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10),
      supabase
        .from('scout_venues')
        .select('id, name, address, city, postcode, latitude, longitude')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
        .limit(10),
    ]);

    const clubs: Club[] = clubsRes.data ?? [];
    // Map scout_venues to Club shape for UI compatibility
    const scoutAsClubs: Club[] = (scoutRes.data ?? []).map((sv) => ({
      id: sv.id,
      name: sv.name,
      slug: sv.name.toLowerCase().replace(/\s+/g, '-'),
      playtomic_tenant_id: null,
      address: sv.address,
      city: sv.city,
      postcode: sv.postcode,
      latitude: sv.latitude ? Number(sv.latitude) : null,
      longitude: sv.longitude ? Number(sv.longitude) : null,
      phone: null,
      website: null,
      court_count: null,
      indoor_courts: 0,
      outdoor_courts: 0,
      description: null,
      image_url: null,
      is_partner: false,
      created_at: '',
      updated_at: '',
    }));

    // Merge and deduplicate by name
    const seen = new Set<string>();
    const merged: Club[] = [];
    for (const c of [...clubs, ...scoutAsClubs]) {
      const key = c.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(c);
      }
    }
    setVenueResults(merged.slice(0, 15));
  }, []);

  const handleSelectVenue = useCallback((club: Club) => {
    setSelectedVenue(club);
    setVenueModalVisible(false);
    setVenueSearch('');
    setVenueResults([]);
  }, []);

  const handleNameChange = useCallback((v: string) => {
    setName(v);
    if (v.trim().length > 0) setNameError(null);
  }, []);

  // ── Navigation ───────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (currentStep === 1) {
      // Validate Step 1
      if (!name.trim()) {
        setNameError('Tournament name is required');
        return;
      }
      setNameError(null);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  }, [currentStep, name]);

  const handleBack = useCallback(() => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  }, [currentStep]);

  const handleEditStep = useCallback((step: 1 | 2) => {
    setCurrentStep(step);
  }, []);

  // ── Create Tournament ────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!user) {
      Alert.alert(
        'Not Signed In',
        'You need to be signed in to create a tournament. Please sign out and sign back in.',
      );
      console.error('handleCreate: user is null — auth session missing');
      return;
    }
    if (!name.trim()) {
      setCurrentStep(1);
      setNameError('Tournament name is required');
      return;
    }

    setLoading(true);
    // Global timeout — if the whole flow takes >15s something is wrong
    let completed = false;
    const creationTimeout = setTimeout(() => {
      if (!completed) {
        setLoading(false);
        Alert.alert('Timeout', 'Tournament creation took too long. Please check your connection and try again.');
      }
    }, 15000);
    try {
      let bannerUrl: string | null = null;

      // Upload banner if present
      if (bannerUri) {
        const ext = bannerUri.split('.').pop() ?? 'jpg';
        const fileName = `${user.id}/${Date.now()}.${ext}`;
        const response = await fetch(bannerUri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('tournament-assets')
          .upload(fileName, blob, { contentType: `image/${ext}` });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage
            .from('tournament-assets')
            .getPublicUrl(fileName);
          bannerUrl = publicUrl;
        }
      }

      const format = FORMATS[selectedFormat];
      const joinCode = generateJoinCode();

      const { data: tournament, error } = await supabase
        .from('tournaments')
        .insert({
          name: name.trim(),
          organizer_id: user.id,
          tournament_format: format.id,
          join_code: joinCode,
          max_players: players,
          points_per_match: points,
          time_per_round_seconds: time * 60,
          club_id: selectedVenue?.id ?? null,
          venue_name: selectedVenue?.name ?? null,
          venue_address: selectedVenue?.address ?? null,
          venue_city: selectedVenue?.city ?? null,
          status: 'draft',
          current_round: 0,
        })
        .select()
        .single();

      if (error) {
        Alert.alert(
          'Tournament Creation Failed',
          `${error.message || 'Unknown error'}\n\nCode: ${error.code ?? 'none'}\nDetails: ${error.details ?? 'none'}`,
        );
        console.error('Tournament insert error:', JSON.stringify(error, null, 2));
        return;
      }

      // Add organiser as a player UNLESS they chose "Host Only"
      if (!toggles.hostOnly) {
        let playerInserted = false;
        for (let attempt = 0; attempt < 2 && !playerInserted; attempt++) {
          const { error: playerError } = await supabase
            .from('tournament_players')
            .insert({
              tournament_id: tournament.id,
              player_id: user.id,
              tournament_status: 'active',
            });

          if (!playerError) {
            playerInserted = true;
          } else if (attempt === 1) {
            Alert.alert(
              'Warning',
              `Tournament created but failed to add you as a player. Join manually with code: ${joinCode}`,
            );
            console.error('tournament_players insert error:', playerError);
          }
        }
      }

      completed = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/tournament/${tournament.id}/lobby`);
    } catch (err: unknown) {
      completed = true;
      const message =
        err instanceof Error ? err.message : JSON.stringify(err);
      Alert.alert(
        'Unexpected Error',
        `Failed to create tournament: ${message}`,
      );
      console.error('Tournament creation error:', err);
    } finally {
      clearTimeout(creationTimeout);
      setLoading(false);
    }
  }, [
    user,
    name,
    bannerUri,
    selectedFormat,
    players,
    courts,
    points,
    time,
    toggles,
    roundLimit,
    advancedValues,
    selectedVenue,
  ]);

  // ── Render ───────────────────────────────────────────────────────────────

  const nextDisabled = currentStep === 1 && !name.trim();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Progress Bar */}
        <WizardProgressBar currentStep={currentStep} />

        {/* Step Content */}
        <View style={styles.stepContent}>
          {currentStep === 1 && (
            <Animated.View
              key="step1"
              entering={FadeInLeft.duration(250)}
              style={styles.stepFill}
            >
              <StepBasics
                name={name}
                onNameChange={handleNameChange}
                nameError={nameError}
                selectedFormat={selectedFormat}
                onSelectFormat={setSelectedFormat}
                bannerUri={bannerUri}
                onPickBanner={handlePickBanner}
                onRemoveBanner={() => setBannerUri(null)}
              />
            </Animated.View>
          )}

          {currentStep === 2 && (
            <Animated.View
              key="step2"
              entering={FadeInRight.duration(250)}
              style={styles.stepFill}
            >
              <StepSettings
                players={players}
                onPlayersChange={setPlayers}
                courts={courts}
                onCourtsChange={setCourts}
                points={points}
                onPointsChange={setPoints}
                time={time}
                onTimeChange={setTime}
                toggles={toggles}
                onToggle={handleToggle}
                selectedVenue={selectedVenue}
                onOpenVenueModal={() => setVenueModalVisible(true)}
                onClearVenue={() => setSelectedVenue(null)}
                venueModalVisible={venueModalVisible}
                venueResults={venueResults}
                venueSearch={venueSearch}
                onVenueSearch={handleVenueSearch}
                onSelectVenue={handleSelectVenue}
                onCloseVenueModal={() => {
                  setVenueModalVisible(false);
                  setVenueSearch('');
                  setVenueResults([]);
                }}
                advancedExpanded={advancedExpanded}
                onToggleAdvanced={() => setAdvancedExpanded((v) => !v)}
                advancedValues={advancedValues}
                onAdvancedValueChange={(key, value) =>
                  setAdvancedValues((prev) => ({ ...prev, [key]: value }))
                }
                roundLimit={roundLimit}
                onRoundLimitChange={setRoundLimit}
              />
            </Animated.View>
          )}

          {currentStep === 3 && (
            <Animated.View
              key="step3"
              entering={FadeInRight.duration(250)}
              style={styles.stepFill}
            >
              <StepPreview
                name={name}
                selectedFormat={selectedFormat}
                bannerUri={bannerUri}
                players={players}
                courts={courts}
                points={points}
                time={time}
                toggles={toggles}
                selectedVenue={selectedVenue}
                advancedValues={advancedValues}
                roundLimit={roundLimit}
                onEditStep={handleEditStep}
              />
            </Animated.View>
          )}
        </View>

        {/* Bottom Nav */}
        <WizardNavBar
          currentStep={currentStep}
          onBack={handleBack}
          onNext={handleNext}
          onCreate={handleCreate}
          nextDisabled={nextDisabled}
          createLoading={loading}
        />
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
  stepContent: {
    flex: 1,
  },
  stepFill: {
    flex: 1,
  },
});
