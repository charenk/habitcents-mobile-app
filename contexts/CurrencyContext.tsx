import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type CurrencyCode,
  DEFAULT_CURRENCY,
  formatMoney,
  type FormatMoneyOptions,
} from '@/utils/currency';
import { getCurrency, setCurrency as persistCurrency } from '@/utils/storage';

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  /** Format an integer cents value in the active currency. */
  format: (cents: number, opts?: FormatMoneyOptions) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    getCurrency().then((code) => setCurrencyState(code));
  }, []);

  const setCurrency = useCallback(async (code: CurrencyCode) => {
    setCurrencyState(code);
    await persistCurrency(code);
  }, []);

  const format = useCallback(
    (cents: number, opts?: FormatMoneyOptions) => formatMoney(cents, currency, opts),
    [currency]
  );

  const value = useMemo(
    () => ({ currency, setCurrency, format }),
    [currency, setCurrency, format]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
