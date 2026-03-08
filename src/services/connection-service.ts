/**
 * Connection Service
 *
 * TypeScript wrapper around the Supabase connection RPCs.
 * "The most important step a man can take is the next one."
 */

import { supabase } from '../lib/supabase';
import type {
  ConnectionStatusResult,
  ConnectionProfile,
  PendingRequest,
  ConnectionMutationResult,
} from '../lib/types';

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get connection status between the current user and a target user.
 * Returns 'none' | 'self' | 'pending' | 'accepted' | 'rejected' | 'blocked'
 * plus direction ('incoming' | 'outgoing') and connection_id when applicable.
 */
export async function getConnectionStatus(
  targetUserId: string,
): Promise<ConnectionStatusResult> {
  const { data, error } = await supabase.rpc('get_connection_status', {
    target_user_id: targetUserId,
  });
  if (error) throw error;
  return data as ConnectionStatusResult;
}

/**
 * Get all accepted connections for a user.
 * Returns profile info for each connected player (excludes ghost profiles).
 */
export async function getConnections(
  userId: string,
): Promise<ConnectionProfile[]> {
  const { data, error } = await supabase.rpc('get_connections', {
    target_user_id: userId,
  });
  if (error) throw error;
  return (data ?? []) as ConnectionProfile[];
}

/**
 * Get count of accepted connections for a user.
 */
export async function getConnectionCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_connection_count', {
    target_user_id: userId,
  });
  if (error) throw error;
  return (data ?? 0) as number;
}

/**
 * Get pending incoming connection requests for the current user.
 */
export async function getPendingRequests(): Promise<PendingRequest[]> {
  const { data, error } = await supabase.rpc('get_pending_requests');
  if (error) throw error;
  return (data ?? []) as PendingRequest[];
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Send a connection request to another player.
 * If they already sent you a request, it auto-accepts (mutual intent).
 */
export async function sendConnectionRequest(
  targetUserId: string,
): Promise<ConnectionMutationResult> {
  const { data, error } = await supabase.rpc('send_connection_request', {
    target_user_id: targetUserId,
  });
  if (error) throw error;
  return data as ConnectionMutationResult;
}

/**
 * Respond to a pending connection request.
 * @param action — 'accept' | 'reject' | 'block'
 */
export async function respondToConnection(
  connectionId: string,
  action: 'accept' | 'reject' | 'block',
): Promise<ConnectionMutationResult> {
  const { data, error } = await supabase.rpc('respond_to_connection', {
    connection_id: connectionId,
    action,
  });
  if (error) throw error;
  return data as ConnectionMutationResult;
}

/**
 * Remove an accepted connection (unfriend).
 */
export async function removeConnection(
  connectionId: string,
): Promise<ConnectionMutationResult> {
  const { data, error } = await supabase.rpc('remove_connection', {
    connection_id: connectionId,
  });
  if (error) throw error;
  return data as ConnectionMutationResult;
}
