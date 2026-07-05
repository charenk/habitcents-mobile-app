/**
 * Personal rule store for the Leak Scan (spec 6). Every user correction becomes a
 * persistent local rule that OUTRANKS the built-in ruleset on all future scans and
 * manual logs. Rules are applied at the top of Stage 7 (categorization) and by the
 * netting / recurrence / date / sign stages.
 *
 * Persisted with the rest of app data via AsyncStorage under a single key. The store
 * is a plain serializable object so it survives reload unchanged. No network, no PII
 * leaves the device. "My corrections" management UI is v1.x; the data model lands now.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExpenseCategory } from '@/types/expense';
import type { DateOrder } from '@/utils/leakScan/types';

const SCAN_RULES_KEY = '@habitcents_scan_rules';

export type ScanRules = {
  /** merchantStem -> category. Recategorize a merchant. Overrides built-ins. */
  merchantCategory: Record<string, ExpenseCategory>;
  /** rawStem -> displayName. Rename a merchant. Display only. */
  merchantRename: Record<string, string>;
  /** pairSignature -> internal:bool. Confirm/deny transfer or refund pair. */
  pairInternal: Record<string, boolean>;
  /** habitSignature -> suppressed. Dismiss a habit ("Not a habit"). */
  suppressedHabits: Record<string, boolean>;
  /** headerFingerprint -> date order. Answer to the DD/MM question. */
  dateOrder: Record<string, DateOrder>;
  /** headerFingerprint -> outflow sign (+1/-1). Sign confirmation answer. */
  signConvention: Record<string, 1 | -1>;
  /** fileFingerprint -> account label. Rename an account. Display only. */
  accountLabel: Record<string, string>;
};

/** An empty, well-formed rule store. */
export function emptyScanRules(): ScanRules {
  return {
    merchantCategory: {},
    merchantRename: {},
    pairInternal: {},
    suppressedHabits: {},
    dateOrder: {},
    signConvention: {},
    accountLabel: {},
  };
}

/** Coerce an arbitrary parsed blob into a valid ScanRules, dropping bad shapes. */
function reviveRules(raw: unknown): ScanRules {
  const base = emptyScanRules();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Record<keyof ScanRules, unknown>>;
  const asStringRecord = (v: unknown): Record<string, string> => {
    const out: Record<string, string> = {};
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === 'string') out[k] = val;
      }
    }
    return out;
  };
  const asBoolRecord = (v: unknown): Record<string, boolean> => {
    const out: Record<string, boolean> = {};
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === 'boolean') out[k] = val;
      }
    }
    return out;
  };
  return {
    merchantCategory: asStringRecord(r.merchantCategory) as Record<string, ExpenseCategory>,
    merchantRename: asStringRecord(r.merchantRename),
    pairInternal: asBoolRecord(r.pairInternal),
    suppressedHabits: asBoolRecord(r.suppressedHabits),
    dateOrder: asStringRecord(r.dateOrder) as Record<string, DateOrder>,
    signConvention: (() => {
      const out: Record<string, 1 | -1> = {};
      const v = r.signConvention;
      if (v && typeof v === 'object') {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          if (val === 1 || val === -1) out[k] = val;
        }
      }
      return out;
    })(),
    accountLabel: asStringRecord(r.accountLabel),
  };
}

/** Load the persisted rule store (empty store when absent or unreadable). */
export async function getScanRules(): Promise<ScanRules> {
  try {
    const value = await AsyncStorage.getItem(SCAN_RULES_KEY);
    if (!value) return emptyScanRules();
    return reviveRules(JSON.parse(value));
  } catch (error) {
    console.error('Error reading scan rules:', error);
    return emptyScanRules();
  }
}

/** Persist the rule store. */
export async function saveScanRules(rules: ScanRules): Promise<void> {
  try {
    await AsyncStorage.setItem(SCAN_RULES_KEY, JSON.stringify(rules));
  } catch (error) {
    console.error('Error saving scan rules:', error);
  }
}

// ---------------------------------------------------------------------------
// Pure rule-writers. Each returns a NEW ScanRules (never mutates input) so callers
// can persist and re-run the pipeline deterministically.
// ---------------------------------------------------------------------------

export function setMerchantCategory(
  rules: ScanRules,
  merchantStem: string,
  category: ExpenseCategory
): ScanRules {
  return { ...rules, merchantCategory: { ...rules.merchantCategory, [merchantStem]: category } };
}

export function setMerchantRename(rules: ScanRules, rawStem: string, displayName: string): ScanRules {
  return { ...rules, merchantRename: { ...rules.merchantRename, [rawStem]: displayName } };
}

export function setPairInternal(rules: ScanRules, pairSignature: string, internal: boolean): ScanRules {
  return { ...rules, pairInternal: { ...rules.pairInternal, [pairSignature]: internal } };
}

export function suppressHabit(rules: ScanRules, habitSignature: string): ScanRules {
  return { ...rules, suppressedHabits: { ...rules.suppressedHabits, [habitSignature]: true } };
}

export function setDateOrder(rules: ScanRules, headerFingerprint: string, order: DateOrder): ScanRules {
  return { ...rules, dateOrder: { ...rules.dateOrder, [headerFingerprint]: order } };
}

export function setSignConvention(
  rules: ScanRules,
  headerFingerprint: string,
  outflowSign: 1 | -1
): ScanRules {
  return { ...rules, signConvention: { ...rules.signConvention, [headerFingerprint]: outflowSign } };
}

export function setAccountLabel(rules: ScanRules, fileFingerprint: string, label: string): ScanRules {
  return { ...rules, accountLabel: { ...rules.accountLabel, [fileFingerprint]: label } };
}
