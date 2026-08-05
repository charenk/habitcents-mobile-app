/**
 * SettingsSheet (step 02, WP-C). Pins the two things the sheet is responsible
 * for: it renders the specced title and rows when visible, and Sign out clears
 * the local session, routes back to onboarding and announces one toast.
 *
 * Provider wiring mirrors __tests__/toast.test.tsx (SafeAreaProvider with
 * initialMetrics + ThemeProvider + ToastProvider), plus CurrencyProvider and
 * OnboardingProvider because the sheet reads both contexts.
 *
 * Two module mocks carry the seams: utils/storage (so the sign-out clear is
 * observable without touching AsyncStorage) and expo-router (no navigator in a
 * unit test). Copy comes from the real constants/strings.ts, so a reworded
 * string moves the assertions with it.
 */
// Full-provider renders exceed jest's 5s default under CI worker load.
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('@/utils/storage', () => {
  const actual = jest.requireActual('@/utils/storage');
  return { ...actual, clearOnboarding: jest.fn(async () => {}) };
});

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ToastProvider } from '@/components/ui/Toast';
import { SettingsSheet } from '@/components/SettingsSheet';
import { clearOnboarding } from '@/utils/storage';
import { strings } from '@/constants/strings';

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
          <OnboardingProvider>
            <ToastProvider>{children}</ToastProvider>
          </OnboardingProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const onClose = jest.fn();

async function renderSheet(visible = true) {
  const view = await render(
    <Providers>
      <SettingsSheet visible={visible} onClose={onClose} />
    </Providers>
  );
  // Flush the provider load effects and the sheet's enter animation.
  await act(async () => {});
  return view;
}

beforeEach(() => {
  onClose.mockClear();
  mockReplace.mockClear();
  mockPush.mockClear();
  (clearOnboarding as jest.Mock).mockClear();
});

afterEach(cleanup);

describe('SettingsSheet', () => {
  it('renders the title, plan line and every row when visible', async () => {
    const view = await renderSheet();

    expect(view.getByText(strings.settings.sheetTitle)).toBeTruthy();
    expect(view.getByText(strings.settings.planFree)).toBeTruthy();
    expect(view.getByText(strings.settings.groupPreferences)).toBeTruthy();
    expect(view.getByText(strings.settings.groupAbout)).toBeTruthy();

    // Rows are found by their accessibility label, which is what VoiceOver reads.
    expect(view.getByLabelText('Currency, USD')).toBeTruthy();
    expect(view.getByLabelText(strings.settings.premiumRow)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.restoreRow)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.signOutRow)).toBeTruthy();
    expect(view.getByLabelText('Version, 1.0.0')).toBeTruthy();
    // The sign-out reassurance sits on the right of its row.
    expect(view.getByText(strings.settings.signOutHint)).toBeTruthy();
  });

  it('renders nothing while hidden', async () => {
    const view = await renderSheet(false);
    expect(view.queryByText(strings.settings.sheetTitle)).toBeNull();
  });

  it('sign out clears the local session, routes to onboarding and toasts', async () => {
    const view = await renderSheet();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.signOutRow));
    });

    expect(clearOnboarding).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/welcome');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(view.getByText(strings.settings.signOutToast)).toBeTruthy();
  });

  it('premium row opens the paywall and closes the sheet', async () => {
    const view = await renderSheet();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.premiumRow));
    });

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=settings');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restore purchases reports the mock outcome in a toast', async () => {
    const view = await renderSheet();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.restoreRow));
    });

    expect(view.getByText(strings.settings.restoreNoneMessage)).toBeTruthy();
  });
});
