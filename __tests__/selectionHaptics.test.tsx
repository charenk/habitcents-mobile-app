/**
 * Touch answers on a switch (Charen, 2026-09-10).
 *
 * Before this, 21 of the app's 27 haptic calls were hapticError and
 * hapticSelection fired in exactly one place (the paywall's plan cards), so
 * the product touched you almost only to tell you that you were wrong. A tab
 * change and either switcher now fire a selection haptic.
 *
 * The half worth pinning is the guard, not the call: re-pressing the segment
 * you are already on does nothing, so buzzing for it would have the control
 * lying about what happened.
 *
 * SegmentedControl is covered here because it renders standalone. The Today
 * chips carry the identical guard and are covered in todaySpentKept, which
 * already has the whole provider stack they need; the tab bar's guard reads
 * navigation state and belongs to a navigator test.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockHapticSelection = jest.fn();
jest.mock('@/utils/motion', () => ({
  ...jest.requireActual('@/utils/motion'),
  hapticSelection: (...args: unknown[]) => mockHapticSelection(...args),
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}

const OPTIONS = [
  { value: 'a', label: 'First' },
  { value: 'b', label: 'Second' },
];

beforeEach(() => {
  mockHapticSelection.mockClear();
});

describe('a switch answers the touch, but only when it switches', () => {
  it('SegmentedControl: fires on a change and stays silent on the selected one', async () => {
    const onChange = jest.fn();
    const view = await render(
      <Providers>
        <SegmentedControl options={OPTIONS} value="a" onChange={onChange} />
      </Providers>
    );

    fireEvent.press(view.getByText('Second'));
    expect(mockHapticSelection).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('b');

    // Already selected: the press is a no-op, so it must not buzz.
    fireEvent.press(view.getByText('First'));
    expect(mockHapticSelection).toHaveBeenCalledTimes(1);
  });

});
