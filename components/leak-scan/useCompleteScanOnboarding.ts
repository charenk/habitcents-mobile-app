import { useCallback } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';

/**
 * Door 2 (leak scan) has no completion call of its own: every exit that lands
 * the user in the app (Results' Bring in 15 days, Graceful Failure's Log by
 * hand) used to skip completeOnboarding() entirely. That left
 * @habitcents_onboarded unset, so the next cold start bounced the user from
 * app/index.tsx back to /onboarding/welcome, whose resume effect sent them
 * straight back to an empty /leak-scan (the relaunch loop, scan gone). Call
 * the returned function from any such exit, before navigating into the app.
 * Guarded on the context's own completedAt so a post-onboarding re-scan never
 * double-fires onboarding_completed.
 */
export function useCompleteScanOnboarding(): () => Promise<void> {
  const { isOnboardingComplete, completeOnboarding } = useOnboarding();

  return useCallback(async () => {
    if (isOnboardingComplete()) return;
    await completeOnboarding();
  }, [isOnboardingComplete, completeOnboarding]);
}
