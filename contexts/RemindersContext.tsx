/**
 * Bill reminders (Tier 1 + 2, ops docs/reminders-spec.md; ADR 0017 d1).
 *
 * Owns the Tier 2 preferences (global switch + default time), the OS
 * permission state, and the reconciler that keeps the OS's scheduled
 * notifications converged onto utils/reminders/plan.ts's answer. Sits inside
 * ExpensesProvider and CurrencyProvider: the plan derives from the expense
 * list, and notification bodies format amounts in the active currency.
 *
 * Reconcile triggers, and why they cover the spec's whole event table:
 * every expense mutation flows through ExpensesContext's commit funnel, so
 * "the expenses array changed" already contains create, edit, delete, undo,
 * materialize and mark-paid; prefs and permission changes are this
 * provider's own state; cold start is the readiness effect's first run; and
 * foreground reconciles unconditionally because the scheduled side drifts
 * with no store change at all (a notification fired, permission flipped in
 * iOS Settings, the timezone moved).
 *
 * The readiness gate is load-bearing: reconciling before expenses, prefs and
 * permission have all hydrated would plan against an empty store and cancel
 * every scheduled reminder at every cold start.
 *
 * Foreground ordering with the materializer needs NO coordination: if this
 * provider reconciles first, the materializer's commit lands afterwards, and
 * the next reconcile (cheap, fingerprint-gated) corrects the plan. Eventual
 * consistency within one foreground event; do not add coordination.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  DEFAULT_REMINDER_PREFS,
  desiredReminders,
  reminderFingerprint,
  type ReminderPermission,
  type ReminderPrefs,
} from '@/utils/reminders/plan';
import { syncReminders } from '@/utils/reminders/sync';
import { getReminderPermission, requestReminderPermission } from '@/utils/reminders/permission';
import { ensureAndroidChannelAsync } from '@/utils/reminders/setup';
import { getReminderPrefs, setReminderPrefs } from '@/utils/storage';
import { useStrings } from '@/utils/i18n';

type RemindersContextValue = {
  prefs: ReminderPrefs;
  /** null until the first read resolves; UI treats null as "not yet known". */
  permission: ReminderPermission | null;
  /** Prompts the OS only while undetermined; otherwise returns the current
   * state. Call at the moment a user turns a reminder on, never at launch. */
  requestPermission: () => Promise<ReminderPermission>;
  /** Tier 2 global switch. Persists, throws on write failure (storage policy). */
  setGlobalEnabled: (enabled: boolean) => Promise<void>;
  /** Tier 2 default time of day. Persists, throws on write failure. */
  setReminderTime: (hour: number, minute: number) => Promise<void>;
};

const RemindersContext = createContext<RemindersContextValue | null>(null);

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const { expenses, isLoading: expensesLoading } = useExpenses();
  const { format } = useCurrency();
  const strings = useStrings();

  const [prefs, setPrefsState] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [permission, setPermission] = useState<ReminderPermission | null>(null);

  // Serializes overlapping reconciles onto one queue (the materializer's
  // materializeChainRef mechanism): a second run always diffs against the
  // first run's already-applied result, so a delete-then-undo inside one
  // toast window cannot interleave its cancel and reschedule.
  const syncChainRef = useRef<Promise<void>>(Promise.resolve());
  const appStateRef = useRef(AppState.currentState);

  // Latest inputs for reconciles started outside the render cycle (the
  // AppState listener); assigned every render so the listener never closes
  // over stale state.
  const inputsRef = useRef({ expenses, prefs, permission, format, strings });
  inputsRef.current = { expenses, prefs, permission, format, strings };
  const readyRef = useRef(false);

  const runSync = useCallback((): Promise<void> => {
    const run = syncChainRef.current
      .then(async () => {
        const inputs = inputsRef.current;
        if (!readyRef.current || inputs.permission === null) return;
        const desired = desiredReminders(
          inputs.expenses,
          inputs.prefs,
          inputs.permission,
          new Date(),
          inputs.format,
          inputs.strings
        );
        await syncReminders(desired);
      })
      .catch((error) => {
        // Background pass nobody asked for: degrade with a log (the
        // materializer's documented exception to the speak-up rule). The
        // next commit, foreground or cold start replans the same set.
        console.error('Error reconciling bill reminders:', error);
      });
    syncChainRef.current = run;
    return run;
  }, []);

  // Hydrate prefs and permission; ensure the Android channel exists before
  // anything schedules.
  useEffect(() => {
    void ensureAndroidChannelAsync(strings);
    getReminderPrefs().then((stored) => {
      setPrefsState(stored);
      setPrefsLoaded(true);
    });
    void getReminderPermission().then(setPermission);
  }, []);

  const ready = !expensesLoading && prefsLoaded && permission !== null;
  readyRef.current = ready;

  // The change marker over exactly the inputs that can alter the desired set,
  // so logging a plain spend never costs a native round trip.
  const fingerprint = useMemo(
    () => (permission === null ? '' : reminderFingerprint(expenses, prefs, permission)),
    [expenses, prefs, permission]
  );

  // Reconcile on readiness (cold start) and on every relevant change.
  // `format` is a dependency because a currency change rewords every body.
  useEffect(() => {
    if (!ready) return;
    void runSync();
  }, [ready, fingerprint, format, runSync]);

  // Foreground: refresh permission (it can change in iOS Settings while
  // backgrounded), then reconcile unconditionally; time has passed and
  // notifications may have fired, neither of which moves the fingerprint.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        void getReminderPermission().then((p) => {
          inputsRef.current = { ...inputsRef.current, permission: p };
          setPermission(p);
          void runSync();
        });
      }
    });
    return () => sub.remove();
  }, [runSync]);

  const requestPermission = useCallback(async (): Promise<ReminderPermission> => {
    const current = inputsRef.current.permission;
    if (current !== null && current !== 'undetermined') return current;
    const result = await requestReminderPermission();
    inputsRef.current = { ...inputsRef.current, permission: result };
    setPermission(result);
    return result;
  }, []);

  const setGlobalEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    const previous = inputsRef.current.prefs;
    const next = { ...previous, enabled };
    inputsRef.current = { ...inputsRef.current, prefs: next };
    setPrefsState(next);
    try {
      await setReminderPrefs(next);
    } catch (error) {
      // Optimistic set, rolled back on a failed persist (CurrencyContext's
      // shape): a switch that will be forgotten at the next launch must not
      // stay flipped on screen. The caller reports the failure.
      inputsRef.current = { ...inputsRef.current, prefs: previous };
      setPrefsState(previous);
      throw error;
    }
  }, []);

  const setReminderTime = useCallback(async (hour: number, minute: number): Promise<void> => {
    const previous = inputsRef.current.prefs;
    const next = { ...previous, hour, minute };
    inputsRef.current = { ...inputsRef.current, prefs: next };
    setPrefsState(next);
    try {
      await setReminderPrefs(next);
    } catch (error) {
      inputsRef.current = { ...inputsRef.current, prefs: previous };
      setPrefsState(previous);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({ prefs, permission, requestPermission, setGlobalEnabled, setReminderTime }),
    [prefs, permission, requestPermission, setGlobalEnabled, setReminderTime]
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error('useReminders must be used within RemindersProvider');
  return ctx;
}
