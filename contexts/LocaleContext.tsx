import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, detectDeviceLocale, type LocaleCode } from '@/utils/locale';
import { getLocaleOverride, setLocaleOverride as persistLocaleOverride } from '@/utils/storage';

type LocaleContextValue = {
  /** The resolved language: the override if one is set, else the device's. */
  locale: LocaleCode;
  /** null means "follow the device locale" (no override set). */
  override: LocaleCode | null;
  setOverride: (code: LocaleCode | null) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Read once per mount: the device locale does not change within a running
  // session, and computing it lazily in useState's initializer (rather than
  // in an effect) means it is already correct before the first paint.
  const [deviceLocale] = useState<LocaleCode>(() => {
    try {
      return detectDeviceLocale();
    } catch (error) {
      console.error('Error detecting device locale:', error);
      return DEFAULT_LOCALE;
    }
  });
  const [override, setOverrideState] = useState<LocaleCode | null>(null);

  React.useEffect(() => {
    getLocaleOverride().then((code) => setOverrideState(code));
  }, []);

  const setOverride = useCallback(async (code: LocaleCode | null) => {
    const previous = override;
    setOverrideState(code);
    try {
      await persistLocaleOverride(code);
    } catch (error) {
      // Same write policy as CurrencyContext: put the old value back rather
      // than keep a language selection that will be gone at next launch.
      setOverrideState(previous);
      throw error;
    }
  }, [override]);

  const locale = override ?? deviceLocale;

  const value = useMemo(
    () => ({ locale, override, setOverride }),
    [locale, override, setOverride]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
