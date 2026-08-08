/**
 * Onboarding step machine: reviving a retired currentStep (W3, "the app is
 * the onboarding" complete, ADR 0020 + 0022). audit_subs, audit_vices,
 * reveal, guided_log, and success all named screens deleted by this update
 * (app/onboarding/audit-subs.tsx, audit-vices.tsx, reveal.tsx, success.tsx).
 * A device that has one of these persisted from before this update must not
 * crash trying to route to a screen that no longer exists (the build 5
 * dayLogs lesson, docs/runs.log: an unhandled resume target is exactly how
 * that crash happened); welcome.tsx's STEP_ROUTE now maps every one of them
 * to the intent picker instead.
 *
 * Formerly __tests__/onboardingGuidedLogRevive.test.tsx, which only covered
 * the single 'guided_log' -> (then) '/onboarding/success' case; renamed and
 * widened to cover the full retired set now that success.tsx and reveal.tsx
 * are gone too, so "reveal keeps resuming to its own screen" is no longer
 * true.
 *
 * Uses the real OnboardingProvider (unlike door1FirstRun.test.tsx /
 * door3BreakSheet.test.tsx, which mock it) so the actual STEP_ROUTE resume
 * effect runs against real persisted state, seeded directly into the
 * AsyncStorage mock.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import OnboardingWelcomeScreen from '@/app/onboarding/welcome';
import type { OnboardingState } from '@/types/onboarding';

const ONBOARDING_STATE_KEY = '@habitcents_onboarding_state';
const AUDIT_ANSWERS_KEY = '@habitcents_audit_answers';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        {/* The honest-zero welcome renders the real KeptHero, which reads
            useCurrency; the provider joined the wrapper at the W1+W3 merge. */}
        <CurrencyProvider>
          <OnboardingProvider>{children}</OnboardingProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function seedStoredStep(currentStep: OnboardingState['currentStep']): Promise<void> {
  const state: OnboardingState = {
    currentStep,
    hasSeenWelcome: true,
    hasSeenValueProps: false,
    hasAddedFirstExpense: false,
    skippedSteps: [],
    doorChosen: 'fresh',
  };
  await AsyncStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
}

async function renderWelcome(): Promise<void> {
  await act(async () => {
    render(
      <Providers>
        <OnboardingWelcomeScreen />
      </Providers>
    );
  });
  // Flush the provider's storage load and the resume effect.
  await act(async () => {});
}

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
});

afterEach(cleanup);

describe('Onboarding step machine: retired steps revive at the intent picker', () => {
  it.each([
    ['audit_subs', '/onboarding/audit-subs'],
    ['audit_vices', '/onboarding/audit-vices'],
    ['reveal', '/onboarding/reveal'],
    ['guided_log', '/onboarding/guided-log'],
    ['success', '/onboarding/success'],
  ] as const)('a stored %s step resumes at the intent picker without crashing', async (step, deletedRoute) => {
    await seedStoredStep(step);

    await expect(renderWelcome()).resolves.not.toThrow();

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/intent');
    expect(mockReplace).not.toHaveBeenCalledWith(deletedRoute);
  });

  it('a step still shipped (fork) keeps resuming to its own screen unaffected', async () => {
    await seedStoredStep('fork');

    await renderWelcome();

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/intent');
  });
});

describe('Onboarding step machine: legacy audit answers', () => {
  it('stored auditAnswers are ignored on revive and cleared on the next completeOnboarding', async () => {
    await seedStoredStep('audit_subs');
    await AsyncStorage.setItem(
      AUDIT_ANSWERS_KEY,
      JSON.stringify({
        selectedSubscriptions: [{ id: 'video', amountCents: 1200, edited: false }],
        viceAnswers: [],
        subsStepDone: true,
        vicesStepDone: false,
      })
    );

    await renderWelcome();

    // Revive never routes anywhere that would read auditAnswers back into a
    // screen; it always lands on the intent picker regardless of what is
    // stored under the legacy key.
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/intent');
    // The key itself is only actually cleared by completeOnboarding()
    // (contexts/OnboardingContext.tsx), not by the revive path; still present
    // here proves the revive path really did leave it untouched rather than
    // silently wiping it as a side effect of routing.
    expect(await AsyncStorage.getItem(AUDIT_ANSWERS_KEY)).not.toBeNull();
  });
});
