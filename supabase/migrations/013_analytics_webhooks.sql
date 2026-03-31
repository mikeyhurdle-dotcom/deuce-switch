-- Analytics Webhooks
-- Triggers database webhooks to the analytics-events Edge Function
-- when key events occur (signups, tournaments, matches).
--
-- These webhooks push events to PostHog for the Smashd OS dashboard.
-- The Edge Function URL must be set after deployment.

-- Enable the pg_net extension for HTTP requests from triggers
create extension if not exists pg_net with schema extensions;

-- Webhook URL (set via Supabase Dashboard > Database > Webhooks)
-- https://wcbpkwxrubditgzdrqof.supabase.co/functions/v1/analytics-events

-- ─── Helper: fire webhook ────────────────────────────────────────────────────

create or replace function public.fire_analytics_webhook()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
  webhook_url text := 'https://wcbpkwxrubditgzdrqof.supabase.co/functions/v1/analytics-events';
  service_key text;
begin
  -- Build the payload matching Supabase webhook format
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
  );

  -- Get the service role key for auth
  service_key := current_setting('app.settings.service_role_key', true);

  -- Fire async HTTP request via pg_net
  perform net.http_post(
    url := webhook_url,
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(service_key, '')
    )
  );

  return NEW;
end;
$$;

-- ─── Triggers ────────────────────────────────────────────────────────────────

-- Track new user signups
create trigger analytics_profile_created
  after insert on public.profiles
  for each row
  when (NEW.is_ghost = false)
  execute function public.fire_analytics_webhook();

-- Track tournament creation
create trigger analytics_tournament_created
  after insert on public.tournaments
  for each row
  execute function public.fire_analytics_webhook();

-- Track tournament completion
create trigger analytics_tournament_completed
  after update of status on public.tournaments
  for each row
  when (NEW.status = 'completed' and OLD.status != 'completed')
  execute function public.fire_analytics_webhook();

-- Track match completion
create trigger analytics_match_completed
  after update of status on public.matches
  for each row
  when (NEW.status = 'approved' and OLD.status != 'approved')
  execute function public.fire_analytics_webhook();

-- Track player joining a tournament
create trigger analytics_player_joined
  after insert on public.tournament_players
  for each row
  execute function public.fire_analytics_webhook();
