import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type Variant,
  type ThemeMode,
  type ColorTokens,
  getColors,
  fonts,
  spacing,
  radii,
  splashGradient,
} from './tokens';

interface ThemeContextValue {
  mode: ThemeMode;
  variant: Variant;
  colors: ColorTokens;
  fonts: (typeof fonts)['classic'];
  spacing: typeof spacing;
  radii: (typeof radii)['classic'];
  splashGradient: readonly string[];
  setMode: (m: ThemeMode) => void;
  setVariant: (v: Variant) => void;
  toggleMode: () => void;
  toggleVariant: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEYS = {
  mode: 'buildwrk-theme-mode',
  variant: 'buildwrk-variant',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');
  const [variant, setVariantState] = useState<Variant>('classic');

  useEffect(() => {
    (async () => {
      const [savedMode, savedVariant] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.mode),
        AsyncStorage.getItem(STORAGE_KEYS.variant),
      ]);
      if (savedMode === 'light' || savedMode === 'dark') setModeState(savedMode);
      if (savedVariant === 'classic' || savedVariant === 'corporate') setVariantState(savedVariant);
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEYS.mode, m);
  }, []);

  const setVariant = useCallback((v: Variant) => {
    setVariantState(v);
    AsyncStorage.setItem(STORAGE_KEYS.variant, v);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const toggleVariant = useCallback(() => {
    setVariant(variant === 'classic' ? 'corporate' : 'classic');
  }, [variant, setVariant]);

  const value: ThemeContextValue = {
    mode,
    variant,
    colors: getColors(variant, mode),
    fonts: fonts[variant],
    spacing,
    radii: radii[variant],
    splashGradient: splashGradient[variant],
    setMode,
    setVariant,
    toggleMode,
    toggleVariant,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
