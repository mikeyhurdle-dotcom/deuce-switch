/**
 * Feed Service
 *
 * Tournament-scoped social feed — posts, comments, and reactions.
 * All RPCs enforce tournament participant access via SECURITY DEFINER.
 *
 * "The purpose of a storyteller is not to tell you how to think,
 *  but to give you questions to think upon."
 */

import { supabase } from '../lib/supabase';
import type {
  FeedPost,
  FeedComment,
  FeedMutationResult,
  ReactionType,
} from '../lib/types';

// ─── Posts ────────────────────────────────────────────────────────────────────

/**
 * Get paginated tournament feed posts with aggregated reactions + comment counts.
 * Returns empty array if user is not a tournament participant.
 */
export async function getTournamentFeed(
  tournamentId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('get_tournament_feed', {
    p_tournament_id: tournamentId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as FeedPost[];
}

/**
 * Create a new post in a tournament feed.
 * Caller must be a tournament participant.
 */
export async function createTournamentPost(
  tournamentId: string,
  content: string,
  imageUrl?: string | null,
): Promise<FeedMutationResult> {
  const { data, error } = await supabase.rpc('create_tournament_post', {
    p_tournament_id: tournamentId,
    p_content: content,
    p_image_url: imageUrl ?? null,
  });
  if (error) throw error;
  return data as FeedMutationResult;
}

/**
 * Delete a post (author only — enforced by RLS).
 */
export async function deleteTournamentPost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_posts')
    .delete()
    .eq('id', postId);
  if (error) throw error;
}

// ─── Comments ────────────────────────────────────────────────────────────────

/**
 * Get paginated comments for a post.
 * Ordered chronologically (oldest first).
 */
export async function getPostComments(
  postId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<FeedComment[]> {
  const { data, error } = await supabase.rpc('get_post_comments', {
    p_post_id: postId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as FeedComment[];
}

/**
 * Add a comment to a post.
 * Caller must be a tournament participant.
 */
export async function addComment(
  postId: string,
  content: string,
): Promise<FeedMutationResult> {
  const { data, error } = await supabase.rpc('add_comment', {
    p_post_id: postId,
    p_content: content,
  });
  if (error) throw error;
  return data as FeedMutationResult;
}

/**
 * Delete a comment (author only — enforced by RLS).
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_comments')
    .delete()
    .eq('id', commentId);
  if (error) throw error;
}

// ─── Reactions ───────────────────────────────────────────────────────────────

/**
 * Toggle a reaction on a post (add if missing, remove if exists).
 * Caller must be a tournament participant.
 */
export async function toggleReaction(
  postId: string,
  reactionType: ReactionType,
): Promise<FeedMutationResult> {
  const { data, error } = await supabase.rpc('toggle_reaction', {
    p_post_id: postId,
    p_reaction_type: reactionType,
  });
  if (error) throw error;
  return data as FeedMutationResult;
}
