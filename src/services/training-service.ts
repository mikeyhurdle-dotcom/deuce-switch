/**
 * Training Service
 *
 * Queries the `training_videos` Supabase table (same backend as the web /learn page).
 */

import { supabase } from '../lib/supabase';
import type { TrainingVideo } from '../lib/types';

/**
 * Fetch featured training videos (max 5).
 */
export async function fetchFeaturedVideos(): Promise<TrainingVideo[]> {
  const { data, error } = await supabase
    .from('training_videos')
    .select('*')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch training videos with optional filters.
 *
 * PLA-481: Defaults to featured=true so the Coach tab only shows the
 * curated launch creator set (6 partners for v1.2.0 — see migration
 * 017_coach_featured_curation.sql). Callers that want the full library
 * (e.g. a future "Browse All" view) can pass `includeUnfeatured: true`.
 */
export async function fetchVideos(filters?: {
  shot_type?: string;
  skill_level?: string;
  includeUnfeatured?: boolean;
}): Promise<TrainingVideo[]> {
  let query = supabase
    .from('training_videos')
    .select('*')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (!filters?.includeUnfeatured) {
    query = query.eq('featured', true);
  }
  if (filters?.shot_type) {
    query = query.eq('shot_type', filters.shot_type);
  }
  if (filters?.skill_level) {
    query = query.eq('skill_level', filters.skill_level);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Extract YouTube video ID from various URL formats.
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2];
      return u.searchParams.get('v');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get YouTube thumbnail URL for a video ID.
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
