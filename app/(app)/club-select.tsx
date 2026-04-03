import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/providers/AuthProvider';
import { searchClubs, setHomeClub, getClubsByCity } from '../../src/services/club-service';
import { Alpha, Colors, Fonts, Radius, Spacing } from '../../src/lib/constants';
import type { Club } from '../../src/lib/types';

export default function ClubSelectScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // On mount, show clubs near user's city if available
  useEffect(() => {
    if (profile?.location) {
      const city = profile.location.split(',')[0].trim();
      if (city.length >= 2) {
        setLoading(true);
        getClubsByCity(city)
          .then(setResults)
          .catch(() => {})
          .finally(() => setLoading(false));
      }
    }
  }, [profile?.location]);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      // If cleared, reload city-based results
      if (profile?.location) {
        const city = profile.location.split(',')[0].trim();
        if (city.length >= 2) {
          const clubs = await getClubsByCity(city).catch(() => [] as Club[]);
          setResults(clubs);
        }
      } else {
        setResults([]);
      }
      return;
    }
    setLoading(true);
    try {
      const clubs = await searchClubs(text);
      setResults(clubs);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [profile?.location]);

  const handleSelect = async (club: Club) => {
    if (!user) return;
    setSaving(club.id);
    try {
      await setHomeClub(user.id, club.id);
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(null);
    }
  };

  const handleClear = async () => {
    if (!user) return;
    setSaving('clear');
    try {
      await setHomeClub(user.id, null);
      await refreshProfile();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(null);
    }
  };

  const isCurrentClub = (clubId: string) => profile?.home_club_id === clubId;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Select Home Club',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.bodySemiBold, fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView testID="screen-club-select" style={styles.safe} edges={['bottom']}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            testID="input-club-search"
            style={styles.searchInput}
            placeholder="Search by club name or city..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => handleSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Current club clear option */}
        {profile?.home_club_id && (
          <Pressable
            style={styles.clearRow}
            onPress={handleClear}
            disabled={saving === 'clear'}
          >
            <Ionicons name="close-circle-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.clearText}>Remove home club</Text>
            {saving === 'clear' && (
              <ActivityIndicator size="small" color={Colors.textMuted} />
            )}
          </Pressable>
        )}

        {/* Results */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading && results.length === 0 ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={Colors.opticYellow} />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.centerState}>
              <Ionicons name="business-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {query.length > 0
                  ? 'No clubs found. Try a different search.'
                  : 'Search for a club by name or city.'}
              </Text>
            </View>
          ) : (
            results.map((club, i) => {
              const isCurrent = isCurrentClub(club.id);
              return (
                <Animated.View
                  key={club.id}
                  entering={FadeInDown.delay(i * 30).springify()}
                >
                  <Pressable
                    style={[styles.clubCard, isCurrent && styles.clubCardActive]}
                    onPress={() => handleSelect(club)}
                    disabled={saving !== null}
                  >
                    <View style={styles.clubIcon}>
                      <Ionicons
                        name={club.is_partner ? 'star' : 'business'}
                        size={18}
                        color={club.is_partner ? Colors.opticYellow : Colors.textDim}
                      />
                    </View>
                    <View style={styles.clubInfo}>
                      <View style={styles.clubNameRow}>
                        <Text style={styles.clubName} numberOfLines={1}>
                          {club.name}
                        </Text>
                        {club.is_partner && (
                          <View style={styles.partnerBadge}>
                            <Text style={styles.partnerText}>PARTNER</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.clubLocation} numberOfLines={1}>
                        {[club.city, club.postcode].filter(Boolean).join(' · ')}
                      </Text>
                      {club.court_count != null && (
                        <Text style={styles.clubCourts}>
                          {club.court_count} court{club.court_count !== 1 ? 's' : ''}
                          {club.indoor_courts > 0 ? ` (${club.indoor_courts} indoor)` : ''}
                        </Text>
                      )}
                    </View>
                    {isCurrent ? (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.opticYellow} />
                    ) : saving === club.id ? (
                      <ActivityIndicator size="small" color={Colors.opticYellow} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    )}
                  </Pressable>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginHorizontal: Spacing[5],
    marginTop: Spacing[3],
    marginBottom: Spacing[3],
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: Spacing[1],
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginHorizontal: Spacing[5],
    marginBottom: Spacing[3],
    paddingVertical: Spacing[2],
  },
  clearText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[10],
    gap: Spacing[2],
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[20],
    gap: Spacing[3],
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  clubCardActive: {
    borderColor: Colors.opticYellow,
    backgroundColor: Alpha.yellow08,
  },
  clubIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubInfo: {
    flex: 1,
    gap: 2,
  },
  clubNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  clubName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  partnerBadge: {
    backgroundColor: Alpha.yellow12,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  partnerText: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: Colors.opticYellow,
    letterSpacing: 0.5,
  },
  clubLocation: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  clubCourts: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
  },
});
