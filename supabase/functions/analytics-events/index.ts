/**
 * Analytics Events Edge Function
 *
 * Called by Supabase database webhooks when key events occur:
 * - New user signup (profiles INSERT)
 * - Tournament created (tournaments INSERT)
 * - Tournament completed (tournaments UPDATE status → completed)
 * - Match completed (matches UPDATE status → approved)
 *
 * Pushes events to PostHog for analytics tracking in the Smashd OS dashboard.
 *
 * Requires POSTHOG_API_KEY in Supabase project secrets.
 */

const POSTHOG_HOST = 'https://us.posthog.com';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

interface PostHogEvent {
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp?: string;
}

async function sendToPostHog(events: PostHogEvent[], apiKey: string) {
  const response = await fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      batch: events,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PostHog API error ${response.status}: ${body}`);
  }
}

function handleProfileInsert(record: Record<string, unknown>): PostHogEvent | null {
  if (record.is_ghost) return null;

  return {
    event: 'user_signed_up',
    distinct_id: record.id as string,
    properties: {
      $set: {
        display_name: record.display_name,
        preferred_position: record.preferred_position,
        visibility: record.visibility,
      },
      source: 'supabase_webhook',
      platform: 'native_app',
    },
    timestamp: record.created_at as string,
  };
}

function handleTournamentInsert(record: Record<string, unknown>): PostHogEvent | null {
  return {
    event: 'tournament_created',
    distinct_id: record.organizer_id as string,
    properties: {
      tournament_id: record.id,
      tournament_name: record.name,
      format: record.tournament_format,
      max_players: record.max_players,
      courts: record.courts,
      points_per_match: record.points_per_match,
      time_per_round: record.time_per_round,
      club_id: record.club_id,
      is_public: record.is_public,
      source: 'supabase_webhook',
      platform: 'native_app',
    },
    timestamp: record.created_at as string,
  };
}

function handleTournamentUpdate(
  record: Record<string, unknown>,
  oldRecord: Record<string, unknown> | null,
): PostHogEvent | null {
  // Only fire when status changes to completed
  if (record.status !== 'completed') return null;
  if (oldRecord?.status === 'completed') return null;

  return {
    event: 'tournament_completed',
    distinct_id: record.organizer_id as string,
    properties: {
      tournament_id: record.id,
      tournament_name: record.name,
      format: record.tournament_format,
      current_round: record.current_round,
      max_players: record.max_players,
      source: 'supabase_webhook',
      platform: 'native_app',
    },
    timestamp: new Date().toISOString(),
  };
}

function handleMatchUpdate(
  record: Record<string, unknown>,
  oldRecord: Record<string, unknown> | null,
): PostHogEvent | null {
  // Only fire when status changes to approved (match completed)
  if (record.status !== 'approved') return null;
  if (oldRecord?.status === 'approved') return null;

  return {
    event: 'match_completed',
    distinct_id: record.tournament_id as string,
    properties: {
      match_id: record.id,
      tournament_id: record.tournament_id,
      round_number: record.round_number,
      team_a_score: record.team_a_score,
      team_b_score: record.team_b_score,
      source: 'supabase_webhook',
      platform: 'native_app',
    },
    timestamp: record.updated_at as string || new Date().toISOString(),
  };
}

function handlePlayerJoined(record: Record<string, unknown>): PostHogEvent | null {
  return {
    event: 'tournament_player_joined',
    distinct_id: record.player_id as string,
    properties: {
      tournament_id: record.tournament_id,
      tournament_status: record.tournament_status,
      source: 'supabase_webhook',
      platform: 'native_app',
    },
    timestamp: record.joined_at as string || new Date().toISOString(),
  };
}

// @ts-ignore Deno
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // @ts-ignore Deno
  const apiKey = Deno.env.get('POSTHOG_API_KEY');
  if (!apiKey) {
    return new Response('POSTHOG_API_KEY not configured', { status: 500 });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { type, table, record, old_record } = payload;

    let event: PostHogEvent | null = null;

    switch (table) {
      case 'profiles':
        if (type === 'INSERT') event = handleProfileInsert(record);
        break;
      case 'tournaments':
        if (type === 'INSERT') event = handleTournamentInsert(record);
        if (type === 'UPDATE') event = handleTournamentUpdate(record, old_record);
        break;
      case 'matches':
        if (type === 'UPDATE') event = handleMatchUpdate(record, old_record);
        break;
      case 'tournament_players':
        if (type === 'INSERT') event = handlePlayerJoined(record);
        break;
      default:
        break;
    }

    if (event) {
      await sendToPostHog([event], apiKey);
      return new Response(JSON.stringify({ success: true, event: event.event }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, event: null, reason: 'no_matching_event' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
