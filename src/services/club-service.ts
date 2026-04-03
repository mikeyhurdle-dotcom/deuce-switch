/**
 * Club Service
 *
 * Search clubs and manage home club selection.
 *
 * PREREQUISITE: Supabase migration needed:
 *   ALTER TABLE profiles ADD COLUMN home_club_id uuid REFERENCES clubs(id);
 */

import { supabase } from '../lib/supabase';
import type { Club } from '../lib/types';

/**
 * Search clubs by name or city. Returns up to 20 results.
 */
export async function searchClubs(query: string): Promise<Club[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .or(`name.ilike.%${trimmed}%,city.ilike.%${trimmed}%`)
    .order('is_partner', { ascending: false })
    .order('name')
    .limit(20);

  if (error) throw error;
  return (data ?? []) as Club[];
}

/**
 * Get a single club by ID.
 */
export async function getClub(clubId: string): Promise<Club | null> {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single();

  if (error) return null;
  return data as Club;
}

/**
 * Set (or clear) the user's home club.
 */
export async function setHomeClub(
  userId: string,
  clubId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ home_club_id: clubId })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Get clubs near a city (simple city-name match).
 */
export async function getClubsByCity(city: string): Promise<Club[]> {
  if (city.length < 2) return [];

  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .ilike('city', `%${city}%`)
    .order('is_partner', { ascending: false })
    .order('name')
    .limit(30);

  if (error) throw error;
  return (data ?? []) as Club[];
}
