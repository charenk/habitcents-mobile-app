/**
 * Persistence for FirstRunRibbon (W2, "the app is the onboarding"). One small
 * AsyncStorage record holds whichever door most recently opened a first-run
 * ribbon, the message key it's showing, and whether it's been dismissed.
 * Once dismissed it never shows again: a re-render, tab switch, or relaunch
 * cannot resurrect an already-seen message.
 *
 * The record also carries `nudgeResolved`, the watch-nudge's own one-shot
 * flag (W2 item 3: "dismissing hides it permanently, same storage record").
 * The nudge and the ribbon are two different affordances from the same
 * first-run moment, so they share one persisted record rather than each
 * owning a separate AsyncStorage key.
 *
 * Kept generic on purpose (doorKey, messageKey are plain strings, no Door
 * 1-specific literals here): Door 3's unit reuses this hook with its own
 * doorKey and copy.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_RUN_RIBBON_KEY = '@habitcents_first_run_ribbon';

export type FirstRunRibbonRecord = {
  door: string;
  messageKey: string;
  dismissed: boolean;
  nudgeResolved?: boolean;
};

async function readRecord(): Promise<FirstRunRibbonRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(FIRST_RUN_RIBBON_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FirstRunRibbonRecord;
  } catch {
    return null;
  }
}

async function writeRecord(record: FirstRunRibbonRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_RUN_RIBBON_KEY, JSON.stringify(record));
  } catch {
    // Deliberate exception to the write policy in utils/storage.ts, and the
    // reason is unchanged: a lost write just means the (harmless) one-time
    // message can show again next time, never a crash and never lost data.
  }
}

export type UseFirstRunRibbon = {
  loaded: boolean;
  /** True while a ribbon for this door is stored and not yet dismissed. */
  ribbonPending: boolean;
  /** The stored messageKey for this door, or null before load / if none. */
  messageKey: string | null;
  /** True once the watch-nudge has been accepted or dismissed. */
  nudgeResolved: boolean;
  /** Opens (or replaces) this door's ribbon with a fresh, undismissed message. */
  showRibbon: (messageKey: string) => Promise<void>;
  /** Permanently dismisses this door's ribbon. */
  dismissRibbon: () => Promise<void>;
  /** Permanently resolves the watch-nudge (accept or dismiss both call this). */
  resolveNudge: () => Promise<void>;
};

export function useFirstRunRibbon(doorKey: string): UseFirstRunRibbon {
  const [record, setRecord] = useState<FirstRunRibbonRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    readRecord().then((stored) => {
      if (!mountedRef.current) return;
      setRecord(stored);
      setLoaded(true);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const showRibbon = useCallback(async (messageKey: string): Promise<void> => {
    const next: FirstRunRibbonRecord = { door: doorKey, messageKey, dismissed: false };
    setRecord(next);
    await writeRecord(next);
  }, [doorKey]);

  const dismissRibbon = useCallback(async (): Promise<void> => {
    setRecord((current) => {
      if (!current) return current;
      const next: FirstRunRibbonRecord = { ...current, dismissed: true };
      void writeRecord(next);
      return next;
    });
  }, []);

  const resolveNudge = useCallback(async (): Promise<void> => {
    setRecord((current) => {
      const base: FirstRunRibbonRecord = current ?? { door: doorKey, messageKey: '', dismissed: false };
      const next: FirstRunRibbonRecord = { ...base, nudgeResolved: true };
      void writeRecord(next);
      return next;
    });
  }, [doorKey]);

  const forThisDoor = loaded && record?.door === doorKey;

  return {
    loaded,
    ribbonPending: forThisDoor && !record.dismissed,
    messageKey: forThisDoor ? record.messageKey : null,
    nudgeResolved: forThisDoor ? !!record.nudgeResolved : false,
    showRibbon,
    dismissRibbon,
    resolveNudge,
  };
}
