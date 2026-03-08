/**
 * Suggestion Service
 *
 * Surfaces "People You've Played With" — players who shared tournaments
 * with the current user but aren't yet connected.
 *
 * "The most important step a man can take is the next one."
 */

import { supabase } from '../lib/supabase';
import type { PlayerSuggestion } from '../lib/types';

/**
 * Get ranked player suggestions based on shared tournament history.
 *
 * Uses the `get_player_suggestions` RPC which:
 * - Finds all users who shared tournaments with the current user
 * - Excludes already-connected, pending, and blocked users
 * - Excludes unclaimed ghost profiles
 * - Ranks by shared tournament count (desc) then recency (desc)
 */
export async function getPlayerSuggestions(
  maxResults: number = 10,
): Promise<PlayerSuggestion[]> {
  const { data, error } = await supabase.rpc('get_player_suggestions', {
    max_results: maxResults,
  });
  if (error) throw error;
  return (data ?? []) as PlayerSuggestion[];
}
