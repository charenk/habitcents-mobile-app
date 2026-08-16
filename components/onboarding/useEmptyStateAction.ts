/**
 * Empty states as onboarding surfaces (PRD v3.1 sect 5, phase 7).
 *
 * The rule this serves: **every empty state a skipper can reach is an
 * onboarding surface**, and must carry a concrete first action rather than a
 * blank illustration. Skipping has no in-flow route to activation by design;
 * the self-serve path is the app itself, so these screens do the teaching.
 *
 * This hook wraps an empty state's CTA so pressing it reports which surface
 * moved a skipper, without every caller having to know the rule or reach for
 * the onboarding context itself.
 */
import { useCallback } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { track } from '@/utils/analytics';

/**
 * Stable surface names. Analytics keys on these, so treat them as a closed
 * vocabulary: rename a screen freely, but leave these alone.
 */
export type EmptyStateSurface =
  | 'money_spent'
  | 'money_upcoming'
  | 'money_habits'
  | 'insights_leaks'
  | 'categories'
  | 'today_spent'
  | 'today_kept'
  | 'insights_month'
  | 'insights_scan';

/**
 * Wrap an empty-state CTA. Returns the handler to hand to `EmptyState`.
 *
 * `skip_activation` fires only when the user actually skipped onboarding.
 * Someone who completed a route already had their first action; counting them
 * here would drown the signal the event exists to carry.
 */
export function useEmptyStateAction(
  surface: EmptyStateSurface,
  onPress: () => void
): () => void {
  const { onboardingState } = useOnboarding();
  const skipped = onboardingState.doorChosen === 'skip';

  return useCallback(() => {
    if (skipped) track('skip_activation', { surface });
    onPress();
  }, [skipped, surface, onPress]);
}
