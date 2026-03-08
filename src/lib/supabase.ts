import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SupabaseConfig } from './constants';

// React Native does NOT use Chrome's Web Locks API,
// so the PKCE deadlock from the web app does not apply here.
// No lock bypass needed — just a clean Supabase client.

// SSR-safe storage adapter: on web during SSR, `window` may not exist.
// IMPORTANT: Each method checks for `window` lazily at call-time, not at
// construction time, so the same Supabase client works after SSR hydration.
const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      },
    };
  }
  // Native: use AsyncStorage
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@react-native-async-storage/async-storage').default;
};

export const supabase = createClient(
  SupabaseConfig.url,
  SupabaseConfig.anonKey,
  {
    auth: {
      storage: getStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Deep linking handles redirects instead
    },
  },
);
