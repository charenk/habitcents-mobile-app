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
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
  mockReset.mockClear();
  // The async-storage mock persists across tests in this file; clear it so
  // one test's completed state can't leak into the next test's provider mount.
  await AsyncStorage.clear();
});

afterEach(cleanup);

describe('Leak scan graceful-failure exits', () => {
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
    expect(mockPush).toHaveBeenCalledWith('/onboarding/welcome');
    expect(trackMock.mock.calls.filter(([event]) => event === 'onboarding_completed')).toHaveLength(0);
  });
});
