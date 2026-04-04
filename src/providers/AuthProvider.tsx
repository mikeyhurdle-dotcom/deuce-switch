import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react-native';
import { supabase } from '../lib/supabase';
import { removePushToken } from '../services/notification-service';
import type { Profile } from '../lib/types';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

async function ensureProfile(user: User, retries = 2): Promise<Profile | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    // Check if profile already exists
    const profile = await fetchProfile(user.id);
    if (profile) return profile;

    // Only attempt INSERT on first try — subsequent retries just fetch
    if (attempt === 0) {
      const displayName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split('@')[0] ??
        'Player';

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name: displayName,
          username: null,
          visibility: 'public',
          matches_played: 0,
          matches_won: 0,
          is_ghost: false,
          marketing_email: false,
          marketing_push: false,
          indoor_courts: 0,
          outdoor_courts: 0,
        })
        .select()
        .single();

      if (!error && data) return data as Profile;
    }

    // Brief delay before retry — profile may be mid-creation from another auth event
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let profileInFlight = false; // Guard against concurrent ensureProfile calls

    // Safety timeout: never hang on loading for more than 8 seconds.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 8000);

    const resolveProfile = async (user: User) => {
      if (profileInFlight) return; // Already resolving — skip duplicate
      profileInFlight = true;
      try {
        const p = await ensureProfile(user);
        if (!cancelled) setProfile(p);
      } catch {
        // Profile fetch failed — session is set, user can still navigate
        if (!cancelled) setProfile(null);
      } finally {
        profileInFlight = false;
        if (!cancelled) { clearTimeout(timeout); setLoading(false); }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      if (session?.user) {
        resolveProfile(session.user);
      } else {
        clearTimeout(timeout);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) { clearTimeout(timeout); setLoading(false); }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        // On fresh sign-in, gate the app behind loading so tabs don't mount
        // and fire fetches before the Supabase client session is fully settled.
        if (event === 'SIGNED_IN') {
          setLoading(true);
        }
        setSession(session);
        if (session?.user) {
          Sentry.setUser({ id: session.user.id });
          await resolveProfile(session.user);
        } else {
          Sentry.setUser(null);
          setProfile(null);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Clean up push token before signing out (non-blocking)
      if (session?.user?.id) {
        removePushToken(session.user.id).catch(() => {});
      }
      await supabase.auth.signOut();
    } catch {
      // Sign out from Supabase failed — clear local state anyway
    } finally {
      setSession(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (!session?.user) return;
    const p = await fetchProfile(session.user.id);
    if (p) setProfile(p);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
