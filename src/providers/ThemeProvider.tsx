import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ───────────────────────────────────────────────────────────────────

/** Light mode is disabled — only 'system' and 'dark' are exposed in settings. */
export type AppearanceMode = 'system' | 'dark';
export type ResolvedScheme = 'dark';

/** Semantic color tokens (dark-only). */
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
  /** Current user preference (system | dark) — always resolves to dark */
  mode: AppearanceMode;
  /** Always 'dark' */
  scheme: ResolvedScheme;
  /** Semantic colors (dark palette) */
  colors: ThemeColors;
  /** Change the appearance mode */
  setMode: (mode: AppearanceMode) => void;
  /** Whether theme has loaded from storage */
  ready: boolean;
};

// ── Palette ─────────────────────────────────────────────────────────────────

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

// ── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'smashd_appearance_mode';

// ── Context ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  scheme: 'dark',
  colors: darkPalette,
  setMode: () => {},
  ready: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** Shortcut — returns the dark color palette. */
export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

// ── Provider ────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>('dark');
  const [ready, setReady] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'dark' || saved === 'system') {
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

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme: 'dark' as const, colors: darkPalette, setMode, ready }),
    [mode, setMode, ready],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
