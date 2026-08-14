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
import React, { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { PickOneSheet } from '@/components/habit-logging/PickOneSheet';
import { useHabits } from '@/contexts/HabitsContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useCompleteScanOnboarding } from './useCompleteScanOnboarding';
import { habitCandidateToDetectedHabit } from '@/utils/leakScanBridge';
import { isHabitLimitReached } from '@/utils/habitLogging';
import { getEntitlement } from '@/utils/purchases';
import { track } from '@/utils/analytics';
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
 *        habit so a caller can show the payoff from its evidence block. The
 *        deck advances; results stays put and passes nothing.
 */
export function useTrackLeak(
  spanDays: number,
  onStarted?: (habit: DetectedHabit) => void
): UseTrackLeak {
  const router = useRouter();
  const { addScanHabit, startBreakingHabit, getActiveHabits } = useHabits();
  const { markHabitStarted } = useOnboarding();
  const completeScanOnboarding = useCompleteScanOnboarding();

  const [habit, setHabit] = useState<DetectedHabit | null>(null);
  const [candidate, setCandidate] = useState<HabitCandidate | null>(null);

  const close = useCallback(() => {
    setHabit(null);
    setCandidate(null);
  }, []);

  const trackLeak = useCallback(
    async (next: HabitCandidate) => {
      const detected = habitCandidateToDetectedHabit(next, spanDays);
      await addScanHabit(detected);
      setCandidate(next);
      setHabit(detected);
    },
    [addScanHabit, spanDays]
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
      if (!habit) return;
      await startBreakingHabit(habit.id, skipValue, valueEdited, 'scan');
      if (candidate) {
        track('scan_habit_tracked', {
          class: candidate.governClass,
          cadence_route: habit.frequency,
        });
      }

      // Starting a habit IS the scan route's activation: a habit now exists and
      // carries a skip value. Onboarding used to complete only on "Bring in
      // your last 30 days" or the graceful-failure exit, so a user who broke
      // their biggest leak and left was still mid-onboarding, and a cold start
      // bounced them back into an empty intake.
      //
      // markHabitStarted runs FIRST: completeOnboarding reads habitStarted off
      // the context's own ref when it builds the onboarding_completed payload,
      // and that ref is what makes these two same-tick calls see each other
      // (OnboardingContext's onboardingStateRef). Reversed, the event would
      // always report habitStarted: false.
      await markHabitStarted();
      await completeScanOnboarding();

      close();
      onStarted?.(habit);
    },
    [habit, candidate, startBreakingHabit, markHabitStarted, completeScanOnboarding, close, onStarted]
  );

  const sheet = (
    <PickOneSheet
      visible={!!habit}
      habit={habit}
      monthTotal={candidate?.totalCents ?? 0}
      occurrences={candidate?.occurrences ?? 0}
      onCancel={close}
      onStart={startBreaking}
      freeTierBlocked={isHabitLimitReached(getActiveHabits().length, getEntitlement())}
      onStartTrial={() => {
        close();
        router.push('/paywall?placement=habit_gate_scan');
      }}
    />
  );

  return { pending: candidate, trackLeak, monitorLeak, sheet };
}
