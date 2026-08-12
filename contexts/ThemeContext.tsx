import React, { createContext, useContext, useMemo } from 'react';
import { lightTheme } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';

// P2-4 (docs/design-package-phase2/05-p2-4-design-unification.md, section 2):
// dark mode is removed from the UI for v1. useTheme() now returns lightTheme
// unconditionally. The dark theme code (constants/theme.ts darkTheme,
// ThemeMode, getThemeMode/setThemeMode in utils/storage.ts) stays in the
// codebase, unreferenced, for the documented v1.x revert path (spec section 2):
// 1. Re-add one Settings row "Appearance" wired to a ThemeMode sheet.
// 2. Restore this provider to read the stored mode and select darkTheme.
// 3. Audit dark tokens against the P2-4 color-semantics rules before shipping.
// 4. No data migration needed; the mode preference key is preserved.

type ThemeContextValue = {
  theme: AppTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // lightTheme is a module-level constant that never changes, so an empty
  // deps array is correct: this object only needs to be created once, not
  // recreated (and re-render every consumer) on every ThemeProvider render.
  const value = useMemo(() => ({ theme: lightTheme }), []);
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx.theme;
}

/**
 * Always false for v1 (light mode only). Kept as a stable API so the one
 * remaining consumer (app/_layout.tsx StatusBarThemed) does not need a
 * separate code path, and so the v1.x dark revert (see comment above) only
 * has to change this function's body, not its callers.
 */
export function useIsDark(): boolean {
  return false;
}
