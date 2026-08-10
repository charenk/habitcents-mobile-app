/**
 * Profile (design/header-unification U4, ADR 0019; back control unified onto
 * ScreenHeader U1; regrouped design/profile-restructure U9). Renders the
 * specced title and the General/More grouping (now pushed as its own screen
 * rather than a bottom sheet), and pins the mutating behaviors: Subscription
 * push, Start over (only on confirm), and the Support/Privacy/Terms rows.
 * Restore purchases no longer lives here (moved to the paywall footer); the
 * plan line under the title is gone (Subscription carries that status now).
 *
 * Provider wiring mirrors the deleted settingsSheet test (SafeAreaProvider
 * with initialMetrics + ThemeProvider + ToastProvider), plus CurrencyProvider
 * and OnboardingProvider because the page reads both contexts.
 *
 * Module mocks carry the seams: utils/storage (so the start-over clear is
 * observable without touching AsyncStorage) and expo-router (no navigator in
 * a unit test). The screen no longer renders a native Stack.Screen header
 * (that was the bug: a transparent floating header whose clearance could
 * overlap the title), so the back control asserted below is the real
 * ScreenHeader pill button, not a stub. Copy comes from the real
 * constants/strings.ts, so a reworded string moves the assertions with it.
 */
// Full-provider renders exceed jest's 5s default under CI worker load.
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack }),
}));

jest.mock('@/utils/storage', () => {
  const actual = jest.requireActual('@/utils/storage');
  return { ...actual, clearOnboarding: jest.fn(async () => {}) };
});

import React from 'react';
import { Linking } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ToastProvider } from '@/components/ui/Toast';
import ProfileScreen from '@/app/profile';
import { clearOnboarding } from '@/utils/storage';
import { strings } from '@/constants/strings';
import { settingsRowLabel } from '@/utils/a11y';

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

async function renderProfile() {
  const view = await render(
    <Providers>
      <ProfileScreen />
    </Providers>
  );
  // Flush the provider load effects.
  await act(async () => {});
  return view;
}

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockBack.mockClear();
  (clearOnboarding as jest.Mock).mockClear();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe('Profile', () => {
  it('renders the title, the General/More grouping and every row, with no plan line', async () => {
    const view = await renderProfile();

    // The serif title is rendered by the shared ScreenHeader and carries the
    // header role VoiceOver needs (ADA-005 pattern).
    const title = view.getByText(strings.profile.title);
    expect(title).toBeTruthy();
    expect(title.props.accessibilityRole).toBe('header');

    // The standalone "Free plan" line is gone; Subscription is the single
    // plan status now.
    expect(view.queryByText('Free plan · 1 habit')).toBeNull();

    expect(view.getByText(strings.settings.groupGeneral)).toBeTruthy();
    expect(view.getByText(strings.settings.groupMore)).toBeTruthy();

    // Rows are found by their accessibility label, which is what VoiceOver reads.
    expect(view.getByLabelText('Currency, USD')).toBeTruthy();
    expect(
      view.getByLabelText(
        settingsRowLabel(strings.settings.subscriptionRow, strings.settings.subscriptionValueFree)
      )
    ).toBeTruthy();
    expect(
      view.getByLabelText(settingsRowLabel(strings.profile.supportRow, strings.settings.supportEmail))
    ).toBeTruthy();
    expect(view.getByLabelText(strings.settings.privacyPolicy)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.termsOfService)).toBeTruthy();
    expect(view.getByLabelText(strings.settings.startOverRow)).toBeTruthy();

    // Restore purchases left Profile entirely; it only lives on the paywall now.
    expect(view.queryByText(strings.paywall.restoreCta)).toBeNull();

    // The start-over reassurance sits on the right of its row.
    expect(view.getByText(strings.settings.startOverHint)).toBeTruthy();
    // Subscription mirrors Currency: a status value left of the chevron. The
    // dev menu's Entitlement row (gated on DEV_MENU_ENABLED) can render the
    // same "Free" text, so this only asserts the value renders at least once
    // rather than requiring a single match.
    expect(view.getAllByText(strings.settings.subscriptionValueFree).length).toBeGreaterThan(0);
    // Support shows the address it will mail to, right-aligned as the row's value.
    expect(view.getByText(strings.settings.supportEmail)).toBeTruthy();
    // Version is a muted centered footer line, not a row.
    expect(view.getByText(strings.settings.versionFooter('1.0.0'))).toBeTruthy();
    expect(view.queryByLabelText('Version, 1.0.0')).toBeNull();
  });

  it('the shared header back button pops the screen', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.common.back));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('tapping Start over opens the confirm sheet without resetting anything', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.startOverRow));
    });

    expect(view.getByText(strings.settings.startOverConfirmTitle)).toBeTruthy();
    expect(view.getByText(strings.settings.startOverConfirmBody)).toBeTruthy();
    expect(clearOnboarding).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('keep going (cancel) leaves the confirm sheet without resetting anything', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.startOverRow));
    });
    await act(async () => {
      fireEvent.press(view.getByText(strings.settings.startOverConfirmCancel));
    });

    expect(clearOnboarding).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('confirming Start over clears the local session, pops back, replaces to onboarding and toasts', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.startOverRow));
    });
    await act(async () => {
      // The confirm sheet's confirm button reuses the row's own label
      // ("Start over"), so both are on screen at once; the sheet's copy is
      // the one that renders last in the tree.
      const matches = view.getAllByText(strings.settings.startOverConfirmCta);
      fireEvent.press(matches[matches.length - 1]);
    });

    expect(clearOnboarding).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/welcome');
    expect(view.getByText(strings.settings.startOverToast)).toBeTruthy();
  });

  it('subscription row pushes the paywall with the settings placement, no back needed', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(
        view.getByLabelText(
          settingsRowLabel(strings.settings.subscriptionRow, strings.settings.subscriptionValueFree)
        )
      );
    });

    expect(mockPush).toHaveBeenCalledWith('/paywall?placement=settings');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('support row opens the mail composer at the shown address', async () => {
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(
        view.getByLabelText(settingsRowLabel(strings.profile.supportRow, strings.settings.supportEmail))
      );
    });

    expect(Linking.openURL).toHaveBeenCalledWith(`mailto:${strings.settings.supportEmail}`);
  });

  it('support row toasts on a Linking failure instead of failing silently', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no mail client'));
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(
        view.getByLabelText(settingsRowLabel(strings.profile.supportRow, strings.settings.supportEmail))
      );
    });

    expect(await view.findByText(strings.settings.mailOpenFailed)).toBeTruthy();
  });

  it('privacy policy row opens the browser and toasts on a Linking failure', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no browser'));
    const view = await renderProfile();

    await act(async () => {
      fireEvent.press(view.getByLabelText(strings.settings.privacyPolicy));
    });

    expect(Linking.openURL).toHaveBeenCalledWith('https://habitcents.com/privacy');
    expect(await view.findByText(strings.settings.linkOpenFailed)).toBeTruthy();
  });

  it('renders the app version from Constants in the footer line', async () => {
    const view = await renderProfile();
    expect(view.getByText(strings.settings.versionFooter('1.0.0'))).toBeTruthy();
  });
});
