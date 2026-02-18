import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getOnboardingState,
  saveOnboardingState,
  getProgressiveFeatureState,
  saveProgressiveFeatureState,
  setHasOnboarded,
} from '@/utils/storage';
import type {
  OnboardingState,
  OnboardingStep,
  ProgressiveFeatureState,
  FeatureReveal,
} from '@/types/onboarding';
import { INITIAL_ONBOARDING_STATE, INITIAL_PROGRESSIVE_STATE, FEATURE_REVEALS } from '@/types/onboarding';

type OnboardingContextValue = {
  onboardingState: OnboardingState;
  progressiveState: ProgressiveFeatureState;
  isLoading: boolean;
  // Onboarding flow
  completeStep: (step: OnboardingStep) => Promise<void>;
  skipStep: (step: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
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

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE);
  const [progressiveState, setProgressiveState] = useState<ProgressiveFeatureState>(INITIAL_PROGRESSIVE_STATE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [storedOnboarding, storedProgressive] = await Promise.all([
        getOnboardingState(),
        getProgressiveFeatureState(),
      ]);

      if (storedOnboarding) {
        setOnboardingState(storedOnboarding);
      }
      if (storedProgressive) {
        setProgressiveState(storedProgressive);
      }

      setIsLoading(false);
    }
    loadData();
  }, []);

  const completeStep = useCallback(async (step: OnboardingStep): Promise<void> => {
    const updates: Partial<OnboardingState> = {};

    switch (step) {
      case 'welcome':
        updates.hasSeenWelcome = true;
        updates.currentStep = 'value_props';
        break;
      case 'value_props':
        updates.hasSeenValueProps = true;
        updates.currentStep = 'first_expense';
        break;
      case 'first_expense':
        updates.hasAddedFirstExpense = true;
        updates.currentStep = 'success';
        break;
      case 'success':
        updates.completedAt = new Date();
        break;
    }

    const updated = { ...onboardingState, ...updates };
    setOnboardingState(updated);
    await saveOnboardingState(updated);
  }, [onboardingState]);

  const skipStep = useCallback(async (step: OnboardingStep): Promise<void> => {
    const updates: Partial<OnboardingState> = {
      skippedSteps: [...onboardingState.skippedSteps, step],
    };

    switch (step) {
      case 'value_props':
        updates.currentStep = 'first_expense';
        break;
      case 'first_expense':
        updates.currentStep = 'success';
        break;
    }

    const updated = { ...onboardingState, ...updates };
    setOnboardingState(updated);
    await saveOnboardingState(updated);
  }, [onboardingState]);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    const updated: OnboardingState = {
      ...onboardingState,
      completedAt: new Date(),
    };
    setOnboardingState(updated);
    await saveOnboardingState(updated);
    await setHasOnboarded();

    // Initialize progressive state
    const initialProgressive: ProgressiveFeatureState = {
      ...progressiveState,
      firstActiveDate: new Date(),
      daysActive: 1,
    };
    setProgressiveState(initialProgressive);
    await saveProgressiveFeatureState(initialProgressive);
  }, [onboardingState, progressiveState]);

  const resetOnboarding = useCallback(async (): Promise<void> => {
    setOnboardingState(INITIAL_ONBOARDING_STATE);
    await saveOnboardingState(INITIAL_ONBOARDING_STATE);
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
        isLoading,
        completeStep,
        skipStep,
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
