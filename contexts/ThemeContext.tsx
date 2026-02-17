import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/constants/theme';
import { getThemeMode, setThemeMode as persistThemeMode } from '@/utils/storage';
import type { AppTheme, ThemeMode } from '@/constants/theme';

type ThemeContextValue = {
  theme: AppTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getThemeMode().then((mode) => setThemeModeState(mode));
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await persistThemeMode(mode);
  };

  const resolvedScheme = themeMode === 'system' ? systemScheme : themeMode;
  const isDark = resolvedScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx.theme;
}

export function useThemeMode(): Pick<ThemeContextValue, 'themeMode' | 'setThemeMode'> {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeProvider');
  return { themeMode: ctx.themeMode, setThemeMode: ctx.setThemeMode };
}

export function useIsDark(): boolean {
  const ctx = useContext(ThemeContext);
  if (!ctx) return false;
  return ctx.isDark;
}
