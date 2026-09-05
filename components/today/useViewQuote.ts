/**
 * RETIRED 2026-09-05 (ADR 0037). Nothing renders this any more: the rotating
 * quote was removed from both Today zero states because it did not fit the
 * app. Kept unreferenced as the documented revert path, the same way
 * constants/theme.ts keeps the dark theme and components/onboarding/
 * AuroraBackground.tsx keeps the retired aurora. Its unit tests still run.
 */
/**
 * useViewQuote (U6): resolves the current quote for one Today pane (Spent or
 * Kept) and advances it once each time that pane becomes active.
 *
 * "Active" is driven entirely by the `active` prop the caller passes in
 * (Today's todayView === 'spent' | 'kept'), not by mount/unmount: DI-7's
 * pager keeps both panes mounted for the lifetime of the screen
 * (app/(tabs)/index.tsx), so a hook that only advanced on mount would never
 * see a second activation. Instead, a ref tracks whether THIS activation has
 * already been counted; it resets to false the moment the pane goes
 * inactive, so the next time it becomes active again, it counts again --
 * "a fresh quote each time the user returns to a view."
 *
 * The initial mount is itself an activation for whichever pane starts
 * active (Spent, by default, or Kept via the ?view=kept deep link): the load
 * effect below counts it directly against the just-read stored value rather
 * than waiting for a later `active` change that will never come for the
 * pane that was already active from the start.
 *
 * App foregrounding is deliberately NOT wired to this hook (no AppState
 * listener): the spec calls for advancing on view activation only, and
 * `active` does not change on a foreground event, so nothing here needs to
 * special-case it.
 *
 * Resilient to corrupt storage: getSpentQuoteSeq/getKeptQuoteSeq
 * (utils/storage.ts) already default to 0 on any unreadable value.
 */
import { useEffect, useRef, useState } from 'react';
import {
  getKeptQuoteSeq,
  getSpentQuoteSeq,
  setKeptQuoteSeq,
  setSpentQuoteSeq,
} from '@/utils/storage';
import { strings, type TodayQuote } from '@/constants/strings';

export type ViewQuoteView = 'spent' | 'kept';

type ViewConfig = {
  quotes: TodayQuote[];
  getSeq: () => Promise<number>;
  setSeq: (value: number) => Promise<void>;
};

function configFor(view: ViewQuoteView): ViewConfig {
  return view === 'spent'
    ? { quotes: strings.today.spentQuotes, getSeq: getSpentQuoteSeq, setSeq: setSpentQuoteSeq }
    : { quotes: strings.today.keptQuotes, getSeq: getKeptQuoteSeq, setSeq: setKeptQuoteSeq };
}

export function useViewQuote(view: ViewQuoteView, active: boolean): TodayQuote {
  const config = configFor(view);
  const [seq, setSeqState] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // True while the CURRENT activation has already incremented the counter;
  // reset on deactivation so the next activation counts again.
  const countedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    config.getSeq().then((stored) => {
      if (!mounted) return;
      let next = stored;
      if (active && !countedRef.current) {
        next = stored + 1;
        countedRef.current = true;
        void config.setSeq(next);
      }
      setSeqState(next);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
    // Runs once per pane per Today mount; `active`'s own transitions are
    // handled by the effect below once the initial load has landed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (!loaded) return;
    if (active && !countedRef.current) {
      countedRef.current = true;
      setSeqState((current) => {
        const next = current + 1;
        void config.setSeq(next);
        return next;
      });
    } else if (!active) {
      countedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, loaded]);

  const len = config.quotes.length;
  const index = ((seq % len) + len) % len;
  return config.quotes[index];
}
