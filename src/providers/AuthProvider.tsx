import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
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

async function ensureProfile(user: User): Promise<Profile | null> {
  // Check if profile already exists
  let profile = await fetchProfile(user.id);
  if (profile) return profile;

  // Create a new profile for first-time users
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

  if (error) {
    // Profile might have been created by a trigger — try fetching again
    return fetchProfile(user.id);
  }

  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Safety timeout: never hang on loading for more than 5 seconds.
    // If getSession hasn't resolved by then, force loading=false so the
    // app is usable (user will land on sign-in and can re-auth).
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      if (session?.user) {
        ensureProfile(session.user)
          .then((p) => { if (!cancelled) setProfile(p); })
          .finally(() => { if (!cancelled) { clearTimeout(timeout); setLoading(false); } });
      } else {
        clearTimeout(timeout);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) { clearTimeout(timeout); setLoading(false); }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          const p = await ensureProfile(session.user);
          setProfile(p);
        } else {
          setProfile(null);
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
      // Clean up push token before signing out
      if (session?.user?.id) {
        await removePushToken(session.user.id);
      }
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    } catch {
      // Ignore sign-out errors
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
