/**
 * Push Notification Edge Function — Round Advanced
 *
 * Sends push notifications to all players in a tournament when a new
 * round starts or the tournament completes. Called from the client
 * (organiser dashboard) or a database webhook when round advances.
 *
 * Expected request body:
 * {
 *   tournament_id: string;
 *   event: 'round_started' | 'tournament_completed';
 *   round_number?: number;
 *   tournament_name: string;
 * }
 *
 * Requires EXPO_ACCESS_TOKEN in Supabase project secrets.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushRequest {
  tournament_id: string;
  event: 'round_started' | 'tournament_completed';
  round_number?: number;
  tournament_name: string;
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: Record<string, unknown>;
  channelId: string;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const payload: PushRequest = await req.json();
    const { tournament_id, event, round_number, tournament_name } = payload;

    if (!tournament_id || !event || !tournament_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all player IDs in this tournament
    const { data: tournamentPlayers, error: playersError } = await supabase
      .from('tournament_players')
      .select('player_id')
      .eq('tournament_id', tournament_id);

    if (playersError || !tournamentPlayers?.length) {
      return new Response(
        JSON.stringify({ error: 'No players found', details: playersError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const playerIds = tournamentPlayers.map((tp) => tp.player_id);

    // Get push tokens for these players
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', playerIds);

    if (tokensError || !tokens?.length) {
      return new Response(
        JSON.stringify({
          message: 'No push tokens found — players may not have notifications enabled',
          sent: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Build notification messages
    const messages: PushMessage[] = tokens.map(({ token }) => {
      let title: string;
      let body: string;

      if (event === 'round_started') {
        title = `Round ${round_number ?? '?'} Starting`;
        body = `${tournament_name} — head to your court!`;
      } else {
        title = 'Tournament Complete!';
        body = `${tournament_name} has ended. Check the final standings!`;
      }

      return {
        to: token,
        title,
        body,
        sound: 'default' as const,
        data: { type: event, tournament_id, round_number },
        channelId: 'tournament',
      };
    });

    // Send via Expo Push API (batch, max 100 per request)
    const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (expoToken) {
      headers['Authorization'] = `Bearer ${expoToken}`;
    }

    const batches: PushMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      batches.push(messages.slice(i, i + 100));
    }

    const results = await Promise.all(
      batches.map((batch) =>
        fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(batch),
        }).then((r) => r.json()),
      ),
    );

    return new Response(
      JSON.stringify({
        message: `Push notifications sent`,
        sent: messages.length,
        results,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
