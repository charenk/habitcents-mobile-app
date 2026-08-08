/**
 * Welcome honest-zero hero (W1, ADR 0020/0022; replaces
 * __tests__/outcomeCarousel.test.tsx now that OutcomeCarousel is retired).
 * A finance app never shows an invented total, so this pins the two things
 * that honor that rule: the real KeptHero renders $0.00 with the honest
 * zero-state caption, and the rotating line under it is always prefixed
 * "for example:" (a marked example, never a total). It also pins that
 * auto-advance never starts under reduced motion (mirrors
 * __tests__/outcomeCarousel.test.tsx's own reduced-motion test) and that
 * Get started still navigates to the intent picker.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockUseReducedMotion = jest.fn(() => false);
jest.mock('@/utils/motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import OnboardingWelcomeScreen from '@/app/onboarding/welcome';
import { strings } from '@/constants/strings';
import { keptHeroLabel } from '@/utils/a11y';

// Non-zero frame + insets so useSafeAreaInsets resolves without a live layout.
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <CurrencyProvider>
          <OnboardingProvider>{children}</OnboardingProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

type RenderApi = Awaited<ReturnType<typeof render>>;

// Async render + async act: the onboarding provider loads stored state in a
// passive effect (mirrors __tests__/intentPicker.test.tsx), and Get started
// awaits a context write before it calls router.
async function renderScreen(): Promise<RenderApi> {
  let view!: RenderApi;
  await act(async () => {
    view = await render(
      <Providers>
        <OnboardingWelcomeScreen />
      </Providers>
    );
  });
  return view;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPush.mockClear();
  mockReplace.mockClear();
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  mockUseReducedMotion.mockReturnValue(false);
});

describe('Welcome honest-zero hero', () => {
  it('renders the real Kept hero at $0.00 with the honest zero-state caption', async () => {
    const view = await renderScreen();

    expect(view.getByLabelText(keptHeroLabel('$0.00'))).toBeTruthy();
    expect(view.getByText('$0.00')).toBeTruthy();
    expect(view.getByText(strings.habitLogging.keptZeroCaption)).toBeTruthy();
  });

  it('renders the example line prefixed "for example:", never as a total', async () => {
    const view = await renderScreen();

    const expectedLabel = `${strings.onboarding.exampleSkipPrefix} ${strings.onboarding.exampleSkips[0]}`;
    expect(view.getByLabelText(expectedLabel)).toBeTruthy();
    expect(view.getByText(strings.onboarding.exampleSkipPrefix, { exact: false })).toBeTruthy();
  });

  it('does not start the rotation interval under reduced motion', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const view = await renderScreen();

    const expectedLabel = `${strings.onboarding.exampleSkipPrefix} ${strings.onboarding.exampleSkips[0]}`;

    // Well past several would-be ~2.6s rotation ticks.
    await act(async () => {
      jest.advanceTimersByTime(2600 * 4);
      await Promise.resolve();
    });

    // Still showing the first fragment; no timer was ever started to move it.
    expect(view.getByText(strings.onboarding.exampleSkips[0])).toBeTruthy();
    expect(view.getByLabelText(expectedLabel)).toBeTruthy();
  });

  it('renders the two honest-zero value rows', async () => {
    const view = await renderScreen();

    expect(view.getByText(strings.onboarding.valuePropLog)).toBeTruthy();
    expect(view.getByText(strings.onboarding.outcomeKeptCounts)).toBeTruthy();
  });

  it('Get started completes the welcome step and navigates to the intent picker', async () => {
    const view = await renderScreen();

    await act(async () => {
      fireEvent.press(view.getByText(strings.onboarding.getStarted));
      await Promise.resolve();
    });

    expect(mockPush).toHaveBeenCalledWith('/onboarding/intent');
  });
});
