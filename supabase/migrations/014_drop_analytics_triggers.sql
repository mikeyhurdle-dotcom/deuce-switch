-- Drop analytics webhook triggers
--
-- The pg_net extension (net.http_post) is not available on this Supabase
-- instance, so these triggers cause error 42883 on every INSERT/UPDATE
-- to profiles, tournaments, tournament_players, and matches — blocking
-- core functionality in production.
--
-- Analytics events are already captured client-side via PostHog; these
-- server-side triggers can be re-added once pg_net is confirmed working.

DROP TRIGGER IF EXISTS analytics_player_joined ON public.tournament_players;
DROP TRIGGER IF EXISTS analytics_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS analytics_tournament_created ON public.tournaments;
DROP TRIGGER IF EXISTS analytics_tournament_completed ON public.tournaments;
DROP TRIGGER IF EXISTS analytics_match_completed ON public.matches;

DROP FUNCTION IF EXISTS public.fire_analytics_webhook();
