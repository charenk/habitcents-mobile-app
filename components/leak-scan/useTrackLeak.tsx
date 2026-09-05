/**
 * Tracking a leak, shared by the habit deck and the results ladder.
 *
 * Both surfaces offer the same promise ("break this one") and must keep the
 * same consequences: the same Decision-1 pick-one sheet Door 1 uses, the same
 * free-tier gate, the same analytics, and the same activation. That last one is
 * why this is a shared hook rather than two similar handlers. Starting a habit
 * is what completes onboarding on the scan route, and a second copy of that
 * sequence is a second chance to get the ordering wrong.
 */
import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { useToast } from '@/components/ui/Toast';
import { useHabits } from '@/contexts/HabitsContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useCompleteScanOnboarding } from './useCompleteScanOnboarding';
import { habitCandidateToDetectedHabit } from '@/utils/leakScanBridge';
import { isHabitLimitReached } from '@/utils/habitLogging';
import { useEntitlement } from '@/utils/purchases';
import { track } from '@/utils/analytics';
import { strings } from '@/constants/strings';
import type { HabitCandidate } from '@/utils/leakScan/types';
import type { DetectedHabit } from '@/types/habit';

export type UseTrackLeak = {
  /** The candidate whose sheet is open, or null. */
  pending: HabitCandidate | null;
  /** Admit the candidate as a habit and open the confirm sheet. */
  trackLeak: (candidate: HabitCandidate) => Promise<void>;
  /** Monitor-only (influence class): a discovered habit, no skip loop. */
  monitorLeak: (candidate: HabitCandidate) => Promise<void>;
  /** Renders the confirm sheet; mount once per screen. */
  sheet: React.ReactNode;
};

/**
 * @param spanDays evidence-window length, the rate divisor (UX-073).
 * @param onStarted runs after a habit is successfully started, carrying the
 *        habit so a caller can show the payoff from its evidence block, and the
 *        candidate so the deck can attribute the outcome to the right card.
 *        Fires ONLY on a real start: never on sheet open, cancel, or the
 *        paywall bounce, which is what makes it safe to hang the
 *        `deck_card_result: 'tracked'` metric on (review round 3, P2-c).
 */
export function useTrackLeak(
  spanDays: number,
  onStarted?: (habit: DetectedHabit, candidate: HabitCandidate) => void
): UseTrackLeak {
  const router = useRouter();
  const { show } = useToast();
  const { addScanHabit, startBreakingHabit, getActiveHabits } = useHabits();
  const { markHabitStarted } = useOnboarding();
  const completeScanOnboarding = useCompleteScanOnboarding();
  // Entitlement touchpoint (ADR 0007, BET-004): reactive so this gate reflects
  // a purchase or the dev menu's toggle without needing a re-navigation.
  const entitlement = useEntitlement();

  const [habit, setHabit] = useState<DetectedHabit | null>(null);
  const [candidate, setCandidate] = useState<HabitCandidate | null>(null);
  // PickOneSheet's Start is a plain sync onPress with no disabled state, so a
  // fast double tap reaches here twice before the first write commits. Without
  // this ref that raced two goal writes and double-fired onboarding_completed
  // (review round 3, P1-1). Same pattern and reason as Today's
  // breakStartInFlightRef.
  const startInFlightRef = useRef(false);

  const close = useCallback(() => {
    setHabit(null);
    setCandidate(null);
  }, []);

  const trackLeak = useCallback(
    async (next: HabitCandidate) => {
      const detected = habitCandidateToDetectedHabit(next, spanDays);
      // The habit that actually lives in state, not the conversion result.
      // addScanHabit de-dupes by merchant pattern, so the returned habit can
      // carry a DIFFERENT id (a detection-era 'habit-*' rather than this
      // 'scan-habit-*') and its real status. Discarding the return value was a
      // dead-end: startBreakingHabit would look up an id that never existed
      // and throw with the sheet open (review round 3, P1-2).
      const admitted = await addScanHabit(detected);

      // Already mid-break (either from detection before the scan, or tracked
      // moments ago on this same route and re-offered by the results ladder):
      // starting again would append a second goal and orphan the first's kept
      // history. Same guard, same toast as Today's break sheet (P1-3).
      if (admitted.status === 'changing' || admitted.status === 'tracking') {
        show(strings.today.alreadyBreakingToast);
        return;
      }

      setCandidate(next);
      setHabit(admitted);
    },
    [addScanHabit, spanDays, show]
  );

  const monitorLeak = useCallback(
    async (next: HabitCandidate) => {
      const detected = habitCandidateToDetectedHabit(next, spanDays);
      await addScanHabit(detected);
      track('scan_habit_tracked', { class: 'influence', cadence_route: 'monitor' });
    },
    [addScanHabit, spanDays]
  );

  const startBreaking = useCallback(
    async (skipValue: number, valueEdited: boolean) => {
      if (!habit || !candidate) return;
      if (startInFlightRef.current) return;
      startInFlightRef.current = true;
      try {
        await startBreakingHabit(habit.id, skipValue, valueEdited, 'scan');
        track('scan_habit_tracked', {
          class: candidate.governClass,
          cadence_route: habit.frequency,
        });

        // Starting a habit IS the scan route's activation: a habit now exists
        // and carries a skip value. Onboarding used to complete only on "Bring
        // in your last 30 days" or the graceful-failure exit, so a user who
        // broke their biggest leak and left was still mid-onboarding, and a
        // cold start bounced them back into an empty intake.
        //
        // markHabitStarted runs FIRST: completeOnboarding reads habitStarted
        // off the context's own ref when it builds the onboarding_completed
        // payload, and that ref is what makes these two same-tick calls see
        // each other (OnboardingContext's onboardingStateRef). Reversed, the
        // event would always report habitStarted: false.
        await markHabitStarted();
        await completeScanOnboarding();

        close();
        onStarted?.(habit, candidate);
      } catch (error) {
        // The guard ref resets in finally so the button comes back; this says
        // why nothing happened instead of leaving a silent no-op (the same
        // contract as Today's handleBreakSheetStart, UX-021).
        console.error('useTrackLeak startBreaking failed', error);
        show(strings.toasts.startHabitFailed);
      } finally {
        startInFlightRef.current = false;
      }
    },
    [
      habit,
      candidate,
      startBreakingHabit,
      markHabitStarted,
      completeScanOnboarding,
      close,
      onStarted,
      show,
    ]
  );

  const sheet = (
    <PickOneSheet
      visible={!!habit}
      habit={habit}
      monthTotal={candidate?.totalCents ?? 0}
      occurrences={candidate?.occurrences ?? 0}
      onCancel={close}
      onStart={startBreaking}
      freeTierBlocked={isHabitLimitReached(getActiveHabits().length, entitlement)}
      entitlement={entitlement}
      onStartTrial={() => {
        close();
        router.push('/paywall?placement=habit_gate_scan');
      }}
    />
  );

  return { pending: candidate, trackLeak, monitorLeak, sheet };
}
