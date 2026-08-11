import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useLeakScanIntake } from '@/components/leak-scan/useLeakScanIntake';
import { IntakeScreen } from '@/components/leak-scan/IntakeScreen';
import { ResultsScreen } from '@/components/leak-scan/ResultsScreen';
import { GracefulFailure } from '@/components/leak-scan/GracefulFailure';
import { useCompleteScanOnboarding } from '@/components/leak-scan/useCompleteScanOnboarding';

/**
 * The Leak Scan route (P2-1b, Door 2). Registered at the exact path
 * app/onboarding's Door 2 pushes to: router.push('/leak-scan'). Owns intake
 * through results end to end; the graceful-failure screen exits into Door 1
 * (docs/design-package-phase2/02-p2-1-onboarding-leak-audit.md section 7,
 * "Door 2 graceful failure re-entry") without touching app/onboarding/,
 * which a sibling build owns.
 */
export default function LeakScanRoute() {
  const router = useRouter();
  const { state, pickAndScan, answerQuestion, reset } = useLeakScanIntake();
  const completeScanOnboarding = useCompleteScanOnboarding();

  const handleTryDifferentExport = useCallback(() => {
    reset();
  }, [reset]);

  const handleStartLeakAudit = useCallback(() => {
    // The user chose to go back, not into the app, so onboarding stays
    // incomplete here (contrast handleLogByHand below).
    // Door 1 entry point; the exact Leak Audit step route is a sibling build
    // (P2-1 onboarding two-door fork), not yet registered. Routing to the
    // fork's own entry keeps this a stable anchor regardless of that build's
    // internal step routing.
    // router.replace, not push (design/leakscan-migration, U12a dead-end
    // fix): a push here let the stack grow welcome > intent > leak-scan >
    // welcome on a repeat visit through this same fork; replace keeps it flat.
    router.replace('/onboarding/welcome');
  }, [router]);

  const handleLogByHand = useCallback(async () => {
    // Graceful failure's other exit into the app; same relaunch-loop guard as
    // Results' Bring in 15 days.
    await completeScanOnboarding();
    router.push('/(tabs)/money');
  }, [router, completeScanOnboarding]);

  // The leak-scan flow's only visible back affordance before a scan produces
  // results (design/leakscan-migration, U12a): previously the invisible iOS
  // edge swipe was the sole way out of intake or graceful failure.
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (state.stage === 'done' && state.result) {
    if (state.result.gracefulFailure) {
      return (
        <GracefulFailure
          onTryDifferentExport={handleTryDifferentExport}
          onStartLeakAudit={handleStartLeakAudit}
          onLogByHand={handleLogByHand}
          onBack={handleBack}
        />
      );
    }
    return <ResultsScreen result={state.result} files={state.files} />;
  }

  return (
    <IntakeScreen state={state} onChooseFiles={pickAndScan} onAnswer={answerQuestion} onBack={handleBack} />
  );
}
