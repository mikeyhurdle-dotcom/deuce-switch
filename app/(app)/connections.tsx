/**
 * ConnectionsScreen — Full connections management
 *
 * Accessible from the profile screen's connections count card.
 * Sections: pending requests (collapsible) + accepted connections grid.
 * Includes search filtering and pull-to-refresh.
 *
 * "The most important step a man can take. It's not the first one, is it?
 *  It's the next one. Always the next step."
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Duration, Fonts, Radius, Spacing } from '../../src/lib/constants';
import { useAuth } from '../../src/providers/AuthProvider';
import {
  getConnections,
  getPendingRequests,
} from '../../src/services/connection-service';
import type { ConnectionProfile, PendingRequest } from '../../src/lib/types';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ConnectionCard } from '../../src/components/ConnectionCard';
import { PendingRequestCard } from '../../src/components/PendingRequestCard';

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ConnectionsScreen() {
  const { user } = useAuth();

  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingExpanded, setPendingExpanded] = useState(true);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [conns, pending] = await Promise.all([
        getConnections(user.id),
        getPendingRequests(),
      ]);
      setConnections(conns);
      setPendingRequests(pending);
    } catch (err) {
      // Fetch error — empty state handles it
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      await fetchData();
      setLoading(false);
    })();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConnectionRemoved = useCallback((connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.connection_id !== connectionId));
  }, []);

  const handleRequestResponded = useCallback(
    (connectionId: string, action: 'accept' | 'reject') => {
      setPendingRequests((prev) =>
        prev.filter((r) => r.connection_id !== connectionId),
      );
      // If accepted, refresh to pick up new connection in the grid
      if (action === 'accept') {
        setTimeout(() => fetchData(), 600);
      }
    },
    [fetchData],
  );

  const togglePending = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingExpanded((prev) => !prev);
  };

  // ── Filtered connections ─────────────────────────────────────────────────

  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const q = searchQuery.toLowerCase();
    return connections.filter(
      (c) =>
        c.display_name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q),
    );
  }, [connections, searchQuery]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'CONNECTIONS',
            headerBackTitle: '',
            headerStyle: { backgroundColor: Colors.darkBg },
            headerTintColor: Colors.textPrimary,
            headerTitleStyle: {
              fontFamily: Fonts.mono,
              fontSize: 14,
            },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.opticYellow} size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'CONNECTIONS',
          headerBackTitle: '',
          headerStyle: { backgroundColor: Colors.darkBg },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontFamily: Fonts.mono,
            fontSize: 14,
          },
        }}
      />

      <SafeAreaView testID="screen-connections" style={styles.container} edges={['bottom']}>
        <FlatList
          data={filteredConnections}
          keyExtractor={(item) => item.connection_id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.opticYellow}
              colors={[Colors.opticYellow]}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerSection}>
              {/* Search Bar */}
              <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.searchContainer}>
                <Ionicons
                  name="search"
                  size={16}
                  color={Colors.textMuted}
                  style={styles.searchIcon}
                />
                <TextInput
                  testID="input-search-connections"
                  style={styles.searchInput}
                  placeholder="Search connections..."
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Search connections"
                />
                {searchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                )}
              </Animated.View>

              {/* Pending Requests Section */}
              {pendingRequests.length > 0 && (
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.pendingSection}>
                  <Pressable
                    style={styles.pendingSectionHeader}
                    onPress={togglePending}
                  >
                    <View style={styles.pendingTitleRow}>
                      <Text style={styles.pendingTitle}>
                        PENDING REQUESTS
                      </Text>
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>
                          {pendingRequests.length}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={pendingExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </Pressable>

                  {pendingExpanded && (
                    <View style={styles.pendingList}>
                      {pendingRequests.map((request) => (
                        <PendingRequestCard
                          key={request.connection_id}
                          request={request}
                          onResponded={handleRequestResponded}
                        />
                      ))}
                    </View>
                  )}
                </Animated.View>
              )}

              {/* Grid Section Header */}
              <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.gridHeader}>
                <Text style={styles.gridTitle}>
                  {searchQuery.trim()
                    ? `${filteredConnections.length} RESULT${filteredConnections.length !== 1 ? 'S' : ''}`
                    : `${connections.length} CONNECTION${connections.length !== 1 ? 'S' : ''}`}
                </Text>
              </Animated.View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <ConnectionCard
                connection={item}
                onRemoved={handleConnectionRemoved}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              iconColor={Colors.violet}
              badgeIcon="link-outline"
              title={searchQuery.trim() ? 'No matches found' : 'No connections yet'}
              subtitle={searchQuery.trim() ? 'Try a different name' : 'Find players to connect with after your next tournament'}
              testID="state-connections-empty"
            />
          }
        />
      </SafeAreaView>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing[4],
    paddingBottom: Spacing[20],
  },

  // ── Header Section ──
  headerSection: {
    gap: Spacing[4],
    marginBottom: Spacing[4],
  },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },

  // ── Pending Section ──
  pendingSection: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pendingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[3],
  },
  pendingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  pendingTitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
    letterSpacing: 1.5,
  },
  pendingBadge: {
    backgroundColor: Colors.coral,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  pendingBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  pendingList: {
    paddingHorizontal: Spacing[3],
    paddingBottom: Spacing[3],
    gap: Spacing[2],
  },

  // ── Grid ──
  gridHeader: {
    marginTop: Spacing[1],
  },
  gridTitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
    letterSpacing: 1.5,
  },
  gridRow: {
    gap: Spacing[3],
  },
  gridItem: {
    flex: 1,
    maxWidth: '50%',
    marginBottom: Spacing[3],
  },

});
