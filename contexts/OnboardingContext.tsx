import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  getOnboardingState,
  saveOnboardingState,
  getProgressiveFeatureState,
  saveProgressiveFeatureState,
  getAuditAnswers,
  saveAuditAnswers,
  clearAuditAnswers,
  setHasOnboarded,
} from '@/utils/storage';
import type {
  OnboardingState,
  OnboardingStep,
  ProgressiveFeatureState,
  FeatureReveal,
  AuditAnswers,
} from '@/types/onboarding';
import {
  INITIAL_ONBOARDING_STATE,
  INITIAL_PROGRESSIVE_STATE,
  INITIAL_AUDIT_ANSWERS,
  FEATURE_REVEALS,
} from '@/types/onboarding';
import { track } from '@/utils/analytics';

type OnboardingContextValue = {
  onboardingState: OnboardingState;
  progressiveState: ProgressiveFeatureState;
  auditAnswers: AuditAnswers;
  isLoading: boolean;
  // Onboarding flow
  completeStep: (step: OnboardingStep) => Promise<void>;
  skipStep: (step: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  /** door_chosen (spec 02 section 2/6): records the two-door fork tap. */
  chooseDoor: (door: 'fresh' | 'statements' | 'skip') => Promise<void>;
  /** Persist Door 1 Leak Audit answers so abandon/reopen resumes correctly (section 7). */
  saveAudit: (answers: AuditAnswers) => Promise<void>;
  /** Records that a habit was started via the pick-one sheet during onboarding
   * (reveal's "Plug the biggest leak" or success's "Break it"), for
   * onboarding_completed's habitStarted property (section 6). */
  markHabitStarted: () => Promise<void>;
  // Progressive reveal
  incrementExpenseCount: () => Promise<void>;
  updateDaysActive: () => Promise<void>;
  checkFeatureReveals: () => FeatureReveal | null;
  dismissReveal: (revealId: string) => Promise<void>;
  isFeatureRevealed: (feature: string) => boolean;
  // Current state
  getCurrentStep: () => OnboardingStep;
  isOnboardingComplete: () => boolean;
  getPendingReveal: () => FeatureReveal | null;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// Step machine (ADR 0020 + 0022, amended by ADR 0026): welcome -> fork, then
// every beat completes onboarding at its own terminal action in the real app
// rather than advancing through a chain of screens.
//
// currentStep no longer ROUTES anywhere. The carousel is the only onboarding
// destination, so whatever step is stored, landing there shows the carousel
// and re-picking is an honest resume; the routing table that used to map
// retired steps is deleted, which is a stronger guarantee than maintaining it
// (the build 5 lesson, docs/runs.log: never let a stale persisted value route
// to gone code). The audit_subs / audit_vices / reveal / guided_log / success
// steps this used to chain through named screens that are now deleted; they
// survive in the union only so an old value still deserializes.
const NEXT_STEP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  welcome: 'fork',
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE);
  const [progressiveState, setProgressiveState] = useState<ProgressiveFeatureState>(INITIAL_PROGRESSIVE_STATE);
  const [auditAnswers, setAuditAnswers] = useState<AuditAnswers>(INITIAL_AUDIT_ANSWERS);
  const [isLoading, setIsLoading] = useState(true);

  // Mirrors onboardingState so back-to-back mutator calls within one handler
  // (e.g. chooseDoor() immediately followed by completeOnboarding()) each see
  // the previous call's write, not a stale render-time closure. React state
  // setters don't update the `onboardingState` variable synchronously, so
  // without this a same-tick sequence would silently drop the first update
  // (same pattern as ExpensesContext's expensesRef).
  const onboardingStateRef = useRef(onboardingState);
  onboardingStateRef.current = onboardingState;

  useEffect(() => {
    async function loadData() {
      const [storedOnboarding, storedProgressive, storedAudit] = await Promise.all([
        getOnboardingState(),
        getProgressiveFeatureState(),
        getAuditAnswers(),
      ]);

      if (storedOnboarding) {
        setOnboardingState(storedOnboarding);
      }
      if (storedProgressive) {
        setProgressiveState(storedProgressive);
      }
      if (storedAudit) {
        setAuditAnswers(storedAudit);
      }

      setIsLoading(false);
    }
    loadData();
  }, []);

  /**
   * The single onboarding-state write. Optimistic, then honest: a failed
   * persist restores the previous step and rethrows, so the flow can never
   * advance the user past a step that will still be waiting for them at the
   * next launch (utils/storage.ts write policy).
   */
  const commitOnboardingState = useCallback(async (next: OnboardingState): Promise<void> => {
    const previous = onboardingStateRef.current;
    onboardingStateRef.current = next;
    setOnboardingState(next);
    try {
      await saveOnboardingState(next);
    } catch (error) {
      onboardingStateRef.current = previous;
      setOnboardingState(previous);
      throw error;
    }
  }, []);

  const completeStep = useCallback(async (step: OnboardingStep): Promise<void> => {
    const updates: Partial<OnboardingState> = {};
    const next = NEXT_STEP[step];
    if (next) updates.currentStep = next;

    if (step === 'welcome') updates.hasSeenWelcome = true;
    if (step === 'guided_log') updates.hasAddedFirstExpense = true;
    if (step === 'success') updates.completedAt = new Date();

    const updated = { ...onboardingStateRef.current, ...updates };
    await commitOnboardingState(updated);

    if (step === 'welcome') {
      track('onboarding_started', {});
    }
    track('onboarding_step_completed', { step });
  }, [commitOnboardingState]);

  const skipStep = useCallback(async (step: OnboardingStep): Promise<void> => {
    const updates: Partial<OnboardingState> = {
      skippedSteps: [...onboardingStateRef.current.skippedSteps, step],
    };
    const next = NEXT_STEP[step];
    if (next) updates.currentStep = next;

    const updated = { ...onboardingStateRef.current, ...updates };
    await commitOnboardingState(updated);

    track('onboarding_step_skipped', { step });
  }, [commitOnboardingState]);

  const chooseDoor = useCallback(async (door: 'fresh' | 'statements' | 'skip'): Promise<void> => {
    const updated: OnboardingState = { ...onboardingStateRef.current, doorChosen: door };
    await commitOnboardingState(updated);
    track('door_chosen', { door });
  }, [commitOnboardingState]);

  const saveAudit = useCallback(async (answers: AuditAnswers): Promise<void> => {
    const previous = auditAnswers;
    setAuditAnswers(answers);
    try {
      await saveAuditAnswers(answers);
    } catch (error) {
      setAuditAnswers(previous);
      throw error;
    }
  }, [auditAnswers]);

  const markHabitStarted = useCallback(async (): Promise<void> => {
    const updated: OnboardingState = { ...onboardingStateRef.current, habitStarted: true };
    await commitOnboardingState(updated);
  }, [commitOnboardingState]);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    const updated: OnboardingState = {
      ...onboardingStateRef.current,
      completedAt: new Date(),
    };
    await commitOnboardingState(updated);
    // Load-bearing: this flag is what app/index.tsx reads to decide whether to
    // show the carousel. If it does not land, the user would be told they are
    // done and meet onboarding again at the next cold start, so let it reject
    // and let the caller say so. commitOnboardingState above already rolled
    // its own key back if it was the one that failed.
    await setHasOnboarded();

    // Everything below is bookkeeping that a failure must not turn into a
    // failed completion: the user is onboarded now either way.
    // clearAuditAnswers only removes a legacy key (see AUDIT_ANSWERS_KEY in
    // utils/storage.ts); progressive state rebuilds itself from use.
    await clearAuditAnswers().catch((error) => {
      console.error('Error clearing legacy audit answers:', error);
    });

    const initialProgressive: ProgressiveFeatureState = {
      ...progressiveState,
      firstActiveDate: new Date(),
      daysActive: 1,
    };
    setProgressiveState(initialProgressive);
    await saveProgressiveFeatureState(initialProgressive).catch((error) => {
      console.error('Error initializing progressive feature state:', error);
    });

    // onboarding_completed (spec 02 section 6) fires here, not at each call
    // site, so every path to completing onboarding (skip, or the success
    // screen's Continue) reports it the same way with no caller convention
    // to forget.
    track('onboarding_completed', {
      door: updated.doorChosen,
      habitStarted: !!updated.habitStarted,
    });
  }, [progressiveState, commitOnboardingState]);

  const resetOnboarding = useCallback(async (): Promise<void> => {
    await commitOnboardingState(INITIAL_ONBOARDING_STATE);
    setAuditAnswers(INITIAL_AUDIT_ANSWERS);
    // Legacy key only; a start-over that already reset the real state must not
    // fail because a dead key could not be removed.
    await clearAuditAnswers().catch((error) => {
      console.error('Error clearing legacy audit answers:', error);
    });
  }, [commitOnboardingState]);

  const incrementExpenseCount = useCallback(async (): Promise<void> => {
    const updated: ProgressiveFeatureState = {
      ...progressiveState,
      expenseCount: progressiveState.expenseCount + 1,
    };
    setProgressiveState(updated);
    // Derived bookkeeping fired by app lifecycle, not by a user action, so
    // it degrades rather than throwing into a screen with no way to react.
    await saveProgressiveFeatureState(updated).catch((error) => {
      console.error('Error saving progressive feature state:', error);
    });
  }, [progressiveState]);

  const updateDaysActive = useCallback(async (): Promise<void> => {
    if (!progressiveState.firstActiveDate) {
      const updated: ProgressiveFeatureState = {
        ...progressiveState,
        firstActiveDate: new Date(),
        daysActive: 1,
      };
      setProgressiveState(updated);
      // Derived bookkeeping fired by app lifecycle, not by a user action, so
      // it degrades rather than throwing into a screen with no way to react.
      await saveProgressiveFeatureState(updated).catch((error) => {
        console.error('Error saving progressive feature state:', error);
      });
      return;
    }

    const now = new Date();
    const first = new Date(progressiveState.firstActiveDate);
    const diffTime = Math.abs(now.getTime() - first.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays !== progressiveState.daysActive) {
      const updated: ProgressiveFeatureState = {
        ...progressiveState,
        daysActive: diffDays,
      };
      setProgressiveState(updated);
      // Derived bookkeeping fired by app lifecycle, not by a user action, so
      // it degrades rather than throwing into a screen with no way to react.
      await saveProgressiveFeatureState(updated).catch((error) => {
        console.error('Error saving progressive feature state:', error);
      });
    }
  }, [progressiveState]);

  const checkFeatureReveals = useCallback((): FeatureReveal | null => {
    for (const reveal of FEATURE_REVEALS) {
      // Skip already revealed features
      if (progressiveState.revealedFeatures.includes(reveal.id)) {
        continue;
      }

      // Check trigger
      let triggered = false;
      switch (reveal.triggerType) {
        case 'expense_count':
          triggered = progressiveState.expenseCount >= reveal.triggerValue;
          break;
        case 'days_active':
          triggered = progressiveState.daysActive >= reveal.triggerValue;
          break;
      }

      if (triggered) {
        return reveal as FeatureReveal;
      }
    }
    return null;
  }, [progressiveState]);

  const dismissReveal = useCallback(async (revealId: string): Promise<void> => {
    const updated: ProgressiveFeatureState = {
      ...progressiveState,
      revealedFeatures: [...progressiveState.revealedFeatures, revealId],
    };
    setProgressiveState(updated);
    // Derived bookkeeping fired by app lifecycle, not by a user action, so
    // it degrades rather than throwing into a screen with no way to react.
    await saveProgressiveFeatureState(updated).catch((error) => {
      console.error('Error saving progressive feature state:', error);
    });
  }, [progressiveState]);

  const isFeatureRevealed = useCallback((feature: string): boolean => {
    return progressiveState.revealedFeatures.some(
      id => FEATURE_REVEALS.find(r => r.id === id)?.feature === feature
    );
  }, [progressiveState]);

  const getCurrentStep = useCallback((): OnboardingStep => {
    return onboardingState.currentStep;
  }, [onboardingState]);

  const isOnboardingComplete = useCallback((): boolean => {
    return !!onboardingState.completedAt;
  }, [onboardingState]);

  const getPendingReveal = useCallback((): FeatureReveal | null => {
    return progressiveState.pendingReveals[0] || null;
  }, [progressiveState]);

  // Every field is either plain state (onboardingState, progressiveState,
  // auditAnswers, isLoading) or a useCallback already listed here, so this
  // deps list is exhaustive.
  const value = useMemo(() => ({
    onboardingState,
    progressiveState,
    auditAnswers,
    isLoading,
    completeStep,
    skipStep,
    chooseDoor,
    saveAudit,
    markHabitStarted,
    completeOnboarding,
    resetOnboarding,
    incrementExpenseCount,
    updateDaysActive,
    checkFeatureReveals,
    dismissReveal,
    isFeatureRevealed,
    getCurrentStep,
    isOnboardingComplete,
    getPendingReveal,
  }), [
    onboardingState, progressiveState, auditAnswers, isLoading, completeStep, skipStep,
    chooseDoor, saveAudit, markHabitStarted, completeOnboarding, resetOnboarding,
    incrementExpenseCount, updateDaysActive, checkFeatureReveals, dismissReveal,
    isFeatureRevealed, getCurrentStep, isOnboardingComplete, getPendingReveal,
  ]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
