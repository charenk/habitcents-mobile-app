/**
 * RemindersSheet (Tier 2, ops docs/reminders-spec.md section 5): the global
 * switch row, the preset time chips, and the denied-permission block with
 * its route to the system setting. The context is a hand mock (this file's
 * scope is the sheet); the reconciliation each setter triggers is pinned in
 * __tests__/remindersContext.test.tsx.
 */
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/utils/analytics', () => ({ track: jest.fn() }));

let mockPrefs = { enabled: true, hour: 9, minute: 0 };
let mockPermission: 'granted' | 'denied' | 'undetermined' = 'granted';
const mockSetGlobalEnabled = jest.fn(async (_on: boolean) => {});
const mockSetReminderTime = jest.fn(async (_h: number, _m: number) => {});

jest.mock('@/contexts/RemindersContext', () => ({
  useReminders: () => ({
    prefs: mockPrefs,
    permission: mockPermission,
    requestPermission: jest.fn(async () => mockPermission),
    setGlobalEnabled: mockSetGlobalEnabled,
    setReminderTime: mockSetReminderTime,
  }),
}));

import React from 'react';
import { Linking } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import {
  REMINDER_TIME_PRESETS,
  RemindersSheet,
  reminderTimeLabelFor,
} from '@/components/settings/RemindersSheet';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const onClose = jest.fn();

async function renderSheet() {
  const view = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <ToastProvider>
          <RemindersSheet visible onClose={onClose} />
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  await act(async () => {});
  return view;
}

async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

beforeEach(() => {
  mockPrefs = { enabled: true, hour: 9, minute: 0 };
  mockPermission = 'granted';
  mockSetGlobalEnabled.mockClear();
  mockSetReminderTime.mockClear();
  (track as jest.Mock).mockClear();
  onClose.mockClear();
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe('the global switch row', () => {
  it('speaks as a switch, reads checked, and persists the flip', async () => {
    const view = await renderSheet();

    const row = view.getByLabelText(strings.settings.remindersGlobalRow);
    expect(row.props.accessibilityState.checked).toBe(true);

    await tap(row);
    expect(mockSetGlobalEnabled).toHaveBeenCalledWith(false);
    expect(track).toHaveBeenCalledWith('reminders_global_toggled', { enabled: false });
  });

  it('hides the time chips while the global switch is off', async () => {
    mockPrefs = { enabled: false, hour: 9, minute: 0 };
    const view = await renderSheet();

    expect(view.queryByText(strings.settings.remindersTimeEyebrow)).toBeNull();
  });
});

describe('the preset time chips', () => {
  it('offers every preset through the locale formatter with the stored one selected', async () => {
    const view = await renderSheet();

    for (const hour of REMINDER_TIME_PRESETS) {
      expect(view.getByText(reminderTimeLabelFor(hour))).toBeTruthy();
    }
    expect(
      view.getByLabelText(`${reminderTimeLabelFor(9)}, selected`)
    ).toBeTruthy();
  });

  it('persists a new time and treats re-tapping the current one as a no-op', async () => {
    const view = await renderSheet();

    await tap(view.getByLabelText(`${reminderTimeLabelFor(20)}, not selected`));
    expect(mockSetReminderTime).toHaveBeenCalledWith(20, 0);
    expect(track).toHaveBeenCalledWith('reminder_time_changed', { hour: 20 });

    mockSetReminderTime.mockClear();
    await tap(view.getByLabelText(`${reminderTimeLabelFor(9)}, selected`));
    expect(mockSetReminderTime).not.toHaveBeenCalled();
  });
});

describe('the denied-permission block', () => {
  it('is absent while permission is granted', async () => {
    const view = await renderSheet();
    expect(view.queryByText(strings.reminders.deniedHint)).toBeNull();
  });

  it('shows the non-blaming line and routes to the system setting', async () => {
    mockPermission = 'denied';
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const view = await renderSheet();

    expect(view.getByText(strings.reminders.deniedHint)).toBeTruthy();
    await tap(view.getByLabelText(strings.settings.remindersOpenSettings));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('failure to open the setting surfaces a toast, never a dead end', async () => {
    mockPermission = 'denied';
    jest.spyOn(Linking, 'openSettings').mockRejectedValue(new Error('no handler'));
    const view = await renderSheet();

    await tap(view.getByLabelText(strings.settings.remindersOpenSettings));
    expect(await view.findByText(strings.settings.linkOpenFailed)).toBeTruthy();
  });
});
