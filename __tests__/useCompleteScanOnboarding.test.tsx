/**
 * useCompleteScanOnboarding (bug fix: Door 2 relaunch loop). Door 2 (leak
 * scan) never called completeOnboarding() anywhere, so a user who finished a
 * scan and proceeded into the app still had @habitcents_onboarded unset; the
 * next cold start bounced them from app/index.tsx back to
 * /onboarding/welcome and straight into an empty /leak-scan, losing their
 * scan. This hook is the shared guard every scan exit-into-the-app now calls.
 *
 * Provider wiring mirrors __tests__/intentPicker.test.tsx: real
 * OnboardingProvider (so completeOnboarding/isOnboardingComplete are the
 * actual shipped implementation, not a stub) backed by the async-storage
 * mock, with utils/analytics mocked so onboarding_completed is observable.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import { useCompleteScanOnboarding } from '@/components/leak-scan/useCompleteScanOnboarding';
import { track } from '@/utils/analytics';

const trackMock = track as jest.MockedFunction<typeof track>;

// Minimal probe standing in for a scan exit handler (ResultsScreen's Bring in
// 15 days / GracefulFailure's Log by hand): a button that calls the guard,
// plus a readout of the context's own completion flag so the guard is
// observed through the real state it reads, not a re-derived one.
function Probe() {
  const completeScanOnboarding = useCompleteScanOnboarding();
  const { isOnboardingComplete } = useOnboarding();
  return (
    <TouchableOpacity accessibilityLabel="scan-exit" onPress={() => completeScanOnboarding()}>
      <Text>{isOnboardingComplete() ? 'complete' : 'incomplete'}</Text>
    </TouchableOpacity>
  );
}

type RenderApi = Awaited<ReturnType<typeof render>>;

async function renderProbe(): Promise<RenderApi> {
  let view!: RenderApi;
  await act(async () => {
    view = await render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>
    );
  });
  return view;
}

async function pressExit(view: RenderApi) {
  await act(async () => {
    fireEvent.press(view.getByLabelText('scan-exit'));
  });
}

beforeEach(async () => {
  trackMock.mockClear();
  // The async-storage mock persists across tests in this file; clear it so
  // one test's completed state can't leak into the next test's provider mount.
  await AsyncStorage.clear();
});

afterEach(cleanup);

describe('useCompleteScanOnboarding', () => {
  it('marks onboarding complete exactly once on a scan exit', async () => {
    const view = await renderProbe();
    expect(view.getByText('incomplete')).toBeTruthy();

    await pressExit(view);

    expect(view.getByText('complete')).toBeTruthy();
    const completedCalls = trackMock.mock.calls.filter(([event]) => event === 'onboarding_completed');
    expect(completedCalls).toHaveLength(1);
  });

  it('does not complete onboarding again on a second scan exit once already complete', async () => {
    const view = await renderProbe();
    await pressExit(view);
    trackMock.mockClear();

    // A post-onboarding re-scan (or a second exit tap) must not double-fire
    // onboarding_completed.
    await pressExit(view);

    expect(view.getByText('complete')).toBeTruthy();
    const completedCalls = trackMock.mock.calls.filter(([event]) => event === 'onboarding_completed');
    expect(completedCalls).toHaveLength(0);
  });
});
