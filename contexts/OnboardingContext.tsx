import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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

// Step transitions for the rebuilt P2-1 flow (spec 02 section 2):
// welcome -> fork -> audit_subs -> audit_vices -> reveal -> guided_log -> success.
const NEXT_STEP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  welcome: 'fork',
  fork: 'audit_subs',
  audit_subs: 'audit_vices',
  audit_vices: 'reveal',
  reveal: 'guided_log',
  guided_log: 'success',
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

  const completeStep = useCallback(async (step: OnboardingStep): Promise<void> => {
    const updates: Partial<OnboardingState> = {};
    const next = NEXT_STEP[step];
    if (next) updates.currentStep = next;

    if (step === 'welcome') updates.hasSeenWelcome = true;
    if (step === 'guided_log') updates.hasAddedFirstExpense = true;
    if (step === 'success') updates.completedAt = new Date();

    const updated = { ...onboardingStateRef.current, ...updates };
    onboardingStateRef.current = updated;
    setOnboardingState(updated);
    await saveOnboardingState(updated);

    if (step === 'welcome') {
      track('onboarding_started', {});
    }
    track('onboarding_step_completed', { step });
  }, []);

  const skipStep = useCallback(async (step: OnboardingStep): Promise<void> => {
    const updates: Partial<OnboardingState> = {
      skippedSteps: [...onboardingStateRef.current.skippedSteps, step],
    };
    const next = NEXT_STEP[step];
    if (next) updates.currentStep = next;

    const updated = { ...onboardingStateRef.current, ...updates };
    onboardingStateRef.current = updated;
    setOnboardingState(updated);
    await saveOnboardingState(updated);

    track('onboarding_step_skipped', { step });
  }, []);

  const chooseDoor = useCallback(async (door: 'fresh' | 'statements' | 'skip'): Promise<void> => {
    const updated: OnboardingState = { ...onboardingStateRef.current, doorChosen: door };
    onboardingStateRef.current = updated;
    setOnboardingState(updated);
    await saveOnboardingState(updated);
    track('door_chosen', { door });
  }, []);

  const saveAudit = useCallback(async (answers: AuditAnswers): Promise<void> => {
    setAuditAnswers(answers);
    await saveAuditAnswers(answers);
  }, []);

  const markHabitStarted = useCallback(async (): Promise<void> => {
    const updated: OnboardingState = { ...onboardingStateRef.current, habitStarted: true };
    onboardingStateRef.current = updated;
    setOnboardingState(updated);
    await saveOnboardingState(updated);
  }, []);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    const updated: OnboardingState = {
      ...onboardingStateRef.current,
      completedAt: new Date(),
    };
    onboardingStateRef.current = updated;
    setOnboardingState(updated);
    await saveOnboardingState(updated);
    await setHasOnboarded();
    await clearAuditAnswers();

    // Initialize progressive state
    const initialProgressive: ProgressiveFeatureState = {
      ...progressiveState,
      firstActiveDate: new Date(),
      daysActive: 1,
    };
    setProgressiveState(initialProgressive);
    await saveProgressiveFeatureState(initialProgressive);

    // onboarding_completed (spec 02 section 6) fires here, not at each call
    // site, so every path to completing onboarding (skip, or the success
    // screen's Continue) reports it the same way with no caller convention
    // to forget.
    track('onboarding_completed', {
      door: updated.doorChosen,
      habitStarted: !!updated.habitStarted,
    });
  }, [progressiveState]);

  const resetOnboarding = useCallback(async (): Promise<void> => {
    onboardingStateRef.current = INITIAL_ONBOARDING_STATE;
    setOnboardingState(INITIAL_ONBOARDING_STATE);
    await saveOnboardingState(INITIAL_ONBOARDING_STATE);
    setAuditAnswers(INITIAL_AUDIT_ANSWERS);
    await clearAuditAnswers();
  }, []);

  const incrementExpenseCount = useCallback(async (): Promise<void> => {
    const updated: ProgressiveFeatureState = {
      ...progressiveState,
      expenseCount: progressiveState.expenseCount + 1,
    };
    setProgressiveState(updated);
    await saveProgressiveFeatureState(updated);
  }, [progressiveState]);

  const updateDaysActive = useCallback(async (): Promise<void> => {
    if (!progressiveState.firstActiveDate) {
      const updated: ProgressiveFeatureState = {
        ...progressiveState,
        firstActiveDate: new Date(),
        daysActive: 1,
      };
      setProgressiveState(updated);
      await saveProgressiveFeatureState(updated);
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
      await saveProgressiveFeatureState(updated);
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
    await saveProgressiveFeatureState(updated);
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

  return (
    <OnboardingContext.Provider
      value={{
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
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
