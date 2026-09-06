import React, { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingCarousel, type BeatIntent } from '@/components/onboarding/OnboardingCarousel';
import { track } from '@/utils/analytics';

// The stored door value the rest of onboarding reads (onboarding_completed).
// Both remaining beats stay on-device from the user's own taps, so both map
// to 'fresh'. The map survives the scan beat's removal (decision 0009)
// because the door is what the funnel is grouped by, and keeping the
// indirection means restoring the scan beat is a one-line change here.
const DOOR_FOR_INTENT: Record<BeatIntent, 'fresh' | 'statements'> = {
  track: 'fresh',
  break: 'fresh',
};

/**
 * Onboarding entry (PRD v3.1 sect 4, ADR 0026).
 *
 * The carousel replaces BOTH the old welcome splash and the intent picker that
 * followed it. One surface, a beat per real workflow, each a recording of the
 * real app with a CTA that starts that same workflow for real.
 *
 * RESUME ROUTING. This screen is now the only onboarding destination, which
 * makes stale persisted steps harmless by construction: whatever
 * `currentStep` holds, landing here shows the carousel, and re-picking is an
 * honest resume. That closes the class of bug that crashed build 5 (a stored
 * step routing to a screen that no longer exists) by removing the routing
 * table rather than maintaining it. `app/onboarding/intent.tsx` stays
 * registered and redirects here, so any persisted deep link still resolves.
 *
 * There used to be one exception: a persisted 'statements' door resumed
 * straight back into the scan flow, which owned state of its own. The scan is
 * dormant behind SCAN_FLOW_ENABLED now (decision 0009), so that effect is
 * gone and the rule has no exceptions left. An install that updated while
 * mid-scan carries a 'statements' door that nothing routes on any more, and
 * lands on the carousel like everyone else. That is the right answer rather
 * than a gap: the flow it wanted to resume no longer exists to resume into,
 * and re-picking is the honest resume the rest of this comment describes.
 */
export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const { completeStep, chooseDoor, completeOnboarding } = useOnboarding();
  // Guards a fast double tap from firing chooseDoor (and its analytics) twice
  // before the first await resolves (UX-062, same as the retired picker).
  const pickInFlightRef = useRef(false);
  // The ghost exit and Android hardware back share one handler, so the guard
  // has to live on the handler rather than on either affordance.
  const skipInFlightRef = useRef(false);

  const handleSkip = useCallback(async () => {
    // Same guard as handlePick, and needed for the same reason twice over:
    // this is wired to both the ghost button AND Android's hardware back, and
    // completeOnboarding has no idempotency of its own, so two fast presses
    // fired onboarding_intent_skipped, door_chosen and onboarding_completed
    // twice each (review round 3, P2-4).
    if (skipInFlightRef.current) return;
    skipInFlightRef.current = true;
    try {
      track('onboarding_intent_skipped', {});
      await chooseDoor('skip');
      await completeOnboarding();
      router.replace('/(tabs)');
    } finally {
      skipInFlightRef.current = false;
    }
  }, [chooseDoor, completeOnboarding, router]);

  /**
   * Two-level back (sect 10): on the carousel itself, system back exits
   * onboarding to the app, which is the same thing the ghost does. Back never
   * steps between beats; paging is swipe and dots only.
   *
   * Android only, because that is where a system back button exists. iOS has
   * no back affordance at an onboarding root, which is the correct behaviour
   * rather than a gap.
   */
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      void handleSkip();
      return true;
    });
    return () => sub.remove();
  }, [handleSkip]);

  const handlePick = useCallback(
    async (intent: BeatIntent) => {
      if (pickInFlightRef.current) return;
      pickInFlightRef.current = true;
      try {
        track('onboarding_intent_selected', { intent });
        await completeStep('welcome');
        await chooseDoor(DOOR_FOR_INTENT[intent]);

        // Every beat starts the REAL workflow (ADR 0026): both open the app's
        // own sheets over Today. completeStep('welcome') advances the
        // persisted currentStep to 'fork' (NEXT_STEP in OnboardingContext),
        // but nothing routes on currentStep any more, so an abandon before
        // the sheet resolves still resumes at this carousel.
        if (intent === 'track') {
          router.replace('/(tabs)?view=spent&firstLog=1');
          return;
        }
        router.replace('/(tabs)?view=kept&breakEntry=1');
      } finally {
        // Reset in finally so a thrown navigation can never leave the guard
        // stuck locked (UX-062).
        pickInFlightRef.current = false;
      }
    },
    [chooseDoor, completeStep, router]
  );

  return <OnboardingCarousel onPick={handlePick} onSkip={handleSkip} />;
}
