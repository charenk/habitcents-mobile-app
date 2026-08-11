/**
 * app/leak-scan.tsx's two Graceful Failure exits (bug fix: Door 2 relaunch
 * loop). "Log your first expense by hand" leaves the scan flow and lands on
 * the app proper, so it must complete onboarding (same relaunch-loop fix as
 * ResultsScreen's Bring in 15 days, covered in
 * __tests__/useCompleteScanOnboarding.test.tsx). "Start with the 90-second
 * Leak Audit" instead sends the user back toward /onboarding/welcome to try
 * Door 1: the user chose to go back, not into the app, so this must NOT
 * complete onboarding.
 *
 * design/leakscan-migration (U12a) additionally pins two follow-on fixes:
 * the Leak Audit exit now uses router.replace, not push, so a repeat visit
 * through this same fork can't stack welcome > intent > leak-scan > welcome;
 * and GracefulFailure now exposes a visible ScreenHeader back pill (the
 * invisible iOS edge swipe used to be the only way out), wired to
 * router.back().
 *
 * useLeakScanIntake is mocked to land directly on the graceful-failure result
 * (its own file-parsing/scan-pipeline behavior is exercised elsewhere); this
 * test is only about what each exit does to onboarding state. Provider wiring
 * mirrors __tests__/intentPicker.test.tsx.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

const mockReset = jest.fn();
jest.mock('@/components/leak-scan/useLeakScanIntake', () => ({
  useLeakScanIntake: () => ({
    state: {
      stage: 'done',
      fileNames: ['statement.csv'],
      files: [],
      skippedFileMessages: [],
      pendingQuestion: null,
      // GracefulFailure only reads the callbacks LeakScanRoute wires up, not
      // this result's other fields, so a minimal graceful-failure shape is
      // enough to reach that branch.
      result: { gracefulFailure: true } as any,
      error: null,
    },
    pickAndScan: jest.fn(),
    answerQuestion: jest.fn(),
    reset: mockReset,
  }),
}));

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import LeakScanRoute from '@/app/leak-scan';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';

const trackMock = track as jest.MockedFunction<typeof track>;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// Reads onboarding's own completion flag alongside the route under test, the
// same way __tests__/useCompleteScanOnboarding.test.tsx observes it, so the
// assertion is against real context state rather than a re-derived one.
let completeReader: { current: () => boolean } = { current: () => false };
function CompletionCapture() {
  const { isOnboardingComplete } = useOnboarding();
  completeReader.current = isOnboardingComplete;
  return null;
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <OnboardingProvider>
          <CompletionCapture />
          {children}
        </OnboardingProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type RenderApi = Awaited<ReturnType<typeof render>>;

async function renderRoute(): Promise<RenderApi> {
  let view!: RenderApi;
  await act(async () => {
    view = await render(
      <Providers>
        <LeakScanRoute />
      </Providers>
    );
  });
  return view;
}

async function pressText(view: RenderApi, text: string) {
  await act(async () => {
    fireEvent.press(view.getByText(text));
  });
}

beforeEach(async () => {
  trackMock.mockClear();
  mockPush.mockClear();
  mockReplace.mockClear();
  mockBack.mockClear();
  mockReset.mockClear();
  // The async-storage mock persists across tests in this file; clear it so
  // one test's completed state can't leak into the next test's provider mount.
  await AsyncStorage.clear();
});

afterEach(cleanup);

describe('Leak scan graceful-failure exits', () => {
  it('shows the Leak Audit exit and still replaces to welcome when onboarding is incomplete', async () => {
    const view = await renderRoute();
    expect(completeReader.current()).toBe(false);

    expect(view.getByText(strings.leakScan.failureStartLeakAudit)).toBeTruthy();

    await pressText(view, strings.leakScan.failureStartLeakAudit);

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/welcome');
  });

  it('hides the Leak Audit exit when onboarding is already complete (review fix: re-scan strand)', async () => {
    // Pre-seed a completed onboarding, the state an Insights re-scan user is
    // already in (@habitcents_onboarding_state, utils/storage.ts). Offering
    // this exit here would replace to /onboarding/welcome, whose resume
    // effect has no honest place to send an already-completed doorChosen
    // back to; the remaining exits are the honest set for a re-scanner.
    await AsyncStorage.setItem(
      '@habitcents_onboarding_state',
      JSON.stringify({
        currentStep: 'welcome',
        hasSeenWelcome: true,
        hasSeenValueProps: true,
        hasAddedFirstExpense: true,
        skippedSteps: [],
        doorChosen: 'statements',
        completedAt: new Date().toISOString(),
      })
    );

    const view = await renderRoute();
    expect(completeReader.current()).toBe(true);

    expect(view.queryByText(strings.leakScan.failureStartLeakAudit)).toBeNull();
    // The other two exits are still offered.
    expect(view.getByText(strings.leakScan.failureTryDifferentExport)).toBeTruthy();
    expect(view.getByText(strings.leakScan.failureLogByHand)).toBeTruthy();
  });

  it('completes onboarding and lands on Money when logging by hand', async () => {
    const view = await renderRoute();
    expect(completeReader.current()).toBe(false);

    await pressText(view, strings.leakScan.failureLogByHand);

    expect(completeReader.current()).toBe(true);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/money');
    expect(trackMock.mock.calls.filter(([event]) => event === 'onboarding_completed')).toHaveLength(1);
  });

  it('leaves onboarding incomplete when going back to the Leak Audit door', async () => {
    const view = await renderRoute();

    await pressText(view, strings.leakScan.failureStartLeakAudit);

    expect(completeReader.current()).toBe(false);
    // replace, not push (U12a dead-end fix): a push here let the stack grow
    // welcome > intent > leak-scan > welcome on a repeat visit.
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/welcome');
    expect(mockPush).not.toHaveBeenCalledWith('/onboarding/welcome');
    expect(trackMock.mock.calls.filter(([event]) => event === 'onboarding_completed')).toHaveLength(0);
  });

  it('exposes a visible back pill that calls router.back() (U12a)', async () => {
    const view = await renderRoute();

    // Previously the invisible iOS edge swipe was the only way out of the
    // graceful-failure screen; ScreenHeader's back pill has no visible text,
    // so it is queried by its accessibility label (strings.common.back).
    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.common.back));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
