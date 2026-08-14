import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useLeakScanIntake } from '@/components/leak-scan/useLeakScanIntake';
import { IntakeScreen } from '@/components/leak-scan/IntakeScreen';
import { ResultsScreen } from '@/components/leak-scan/ResultsScreen';
import { ScopeScreen } from '@/components/leak-scan/ScopeScreen';
import { DeckScreen } from '@/components/leak-scan/DeckScreen';
import { PayoffScreen } from '@/components/leak-scan/PayoffScreen';
import { BillsScreen } from '@/components/leak-scan/BillsScreen';
import { GracefulFailure } from '@/components/leak-scan/GracefulFailure';
import { useCompleteScanOnboarding } from '@/components/leak-scan/useCompleteScanOnboarding';
import { useOnboarding } from '@/contexts/OnboardingContext';

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
  const {
    state,
    pickAndScan,
    answerQuestion,
    toggleScopeCategory,
    confirmScope,
    dismissDeckCandidate,
    leaveDeck,
    enterPayoff,
    leavePayoff,
    finishBills,
    reset,
  } = useLeakScanIntake();
  const completeScanOnboarding = useCompleteScanOnboarding();
  const { isOnboardingComplete } = useOnboarding();

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

  // Scope selection (PRD v3.1 sect 7.1) sits between a finished extraction and
  // the results: the user declares where to look before anything is proposed.
  // Back here returns to intake rather than leaving the flow, so a user who
  // changes their mind about the file is not forced through the results first.
  if (state.stage === 'scope' && state.result) {
    return (
      <ScopeScreen
        scope={state.scope}
        onToggle={toggleScopeCategory}
        onConfirm={confirmScope}
        onBack={handleBack}
      />
    );
  }

  // The habit deck (PRD v3.1 sect 7.3): at most three cards between the scope
  // the user just drew and the full breakdown. Tracking one, rejecting all
  // three, or taking the ghost exit all land on the results ladder, which is
  // terminal: one fallback hop, never a fallback of a fallback.
  if (state.stage === 'deck' && state.result) {
    return (
      <DeckScreen
        candidates={state.deck}
        spanDays={state.result.coverage?.spanDays ?? 0}
        onDismiss={dismissDeckCandidate}
        onSeeEverything={leaveDeck}
        onActivated={enterPayoff}
        onBack={handleBack}
      />
    );
  }

  // The payoff (PRD v3.1 sect 7.5): the moment the product exists to deliver,
  // carrying the user's real history rather than a ceremony. No back
  // affordance, it reads forward only.
  if (state.stage === 'payoff' && state.activated) {
    return <PayoffScreen habit={state.activated} onContinue={leavePayoff} />;
  }

  // Bills to Upcoming (PRD v3.1 sect 8), after the payoff and never before it.
  // Tracking an essential is fine; proposing you skip it is not, so this files
  // rather than nudges.
  if (state.stage === 'bills') {
    return (
      <BillsScreen offer={state.billsOffer} result={state.result} onDone={finishBills} />
    );
  }

  if (state.stage === 'done' && state.result) {
    if (state.result.gracefulFailure) {
      return (
        <GracefulFailure
          onTryDifferentExport={handleTryDifferentExport}
          onStartLeakAudit={handleStartLeakAudit}
          onLogByHand={handleLogByHand}
          onBack={handleBack}
          // Review fix (build 12 re-scan entry): an already-onboarded user
          // reaching graceful failure through Insights' re-scan entry must
          // not be offered the audit exit. It replaces to
          // /onboarding/welcome, whose resume effect only knows how to route
          // an in-progress onboarding; a completed one with a non-statements
          // doorChosen would land in the intent picker with no way back into
          // the app, and even a statements doorChosen just bounces straight
          // back to this same screen. Onboarding-time behavior (this option
          // shown) is unchanged.
          showAuditExit={!isOnboardingComplete()}
        />
      );
    }
    return <ResultsScreen result={state.result} files={state.files} />;
  }

  return (
    <IntakeScreen state={state} onChooseFiles={pickAndScan} onAnswer={answerQuestion} onBack={handleBack} />
  );
}
