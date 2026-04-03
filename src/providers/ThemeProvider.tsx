import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ───────────────────────────────────────────────────────────────────

export type AppearanceMode = 'system' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';

/** Semantic color tokens that vary by theme. */
export type ThemeColors = {
  // Backgrounds
  bg: string;
  card: string;
  surface: string;
  surfaceLight: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textDim: string;
  textMuted: string;

  // Borders
  border: string;
  borderStrong: string;

  // Overlays / separators
  separator: string;
};

type ThemeContextValue = {
  /** Current user preference (system | light | dark) */
  mode: AppearanceMode;
  /** Resolved active scheme after applying system preference */
  scheme: ResolvedScheme;
  /** Semantic colors for the active scheme */
  colors: ThemeColors;
  /** Change the appearance mode */
  setMode: (mode: AppearanceMode) => void;
  /** Whether theme has loaded from storage */
  ready: boolean;
};

// ── Palettes ────────────────────────────────────────────────────────────────

const darkPalette: ThemeColors = {
  bg: '#0A0F1C',
  card: '#111827',
  surface: '#1E293B',
  surfaceLight: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#E2E8F0',
  textDim: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  borderStrong: '#94A3B8',
  separator: 'rgba(255,255,255,0.06)',
};

const lightPalette: ThemeColors = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  surface: '#F1F5F9',
  surfaceLight: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#1E293B',
  textDim: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#64748B',
  separator: 'rgba(0,0,0,0.06)',
};

// ── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'smashd_appearance_mode';

// ── Context ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  scheme: 'dark',
  colors: darkPalette,
  setMode: () => {},
  ready: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** Shortcut — returns just the semantic color palette for the active scheme. */
export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

// ── Provider ────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>('system');
  const [ready, setReady] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setMode = useCallback((newMode: AppearanceMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  }, []);

  const scheme: ResolvedScheme = useMemo(() => {
    if (mode === 'system') {
      return deviceScheme === 'light' ? 'light' : 'dark';
    }
    return mode;
  }, [mode, deviceScheme]);

  const colors = scheme === 'light' ? lightPalette : darkPalette;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors, setMode, ready }),
    [mode, scheme, colors, setMode, ready],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
