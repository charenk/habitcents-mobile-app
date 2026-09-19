/**
 * ConfirmSheet (components/ui/ConfirmSheet.tsx): the re-entrancy guard.
 *
 * The sheet stays mounted and interactive through Sheet's 220ms exit
 * animation (Sheet.tsx `rendered` state), so nothing previously stopped a
 * fast double tap on confirm from firing onConfirm twice before the sheet
 * visually closed. For Profile's "Start over" caller that meant two
 * router.back() calls. These tests pin the fix: an in-flight ref blocks
 * every press after the first confirm, including cancel, until `visible`
 * flips true again (the sheet reopening) resets it.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const CONFIRM_LABEL = 'Stop breaking';
const CANCEL_LABEL = 'Keep going';

async function tap(element: Parameters<typeof fireEvent.press>[0]): Promise<void> {
  await act(async () => {
    fireEvent.press(element);
  });
}

afterEach(cleanup);

describe('ConfirmSheet re-entrancy guard', () => {
  it('fires onConfirm once even on a fast double tap', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await render(
      <Providers>
        <ConfirmSheet
          visible
          onClose={onClose}
          onConfirm={onConfirm}
          title="Stop breaking this habit?"
          body="You can start it again anytime."
          confirmLabel={CONFIRM_LABEL}
          cancelLabel={CANCEL_LABEL}
        />
      </Providers>
    );

    // Both presses land before the sheet has a chance to actually close
    // (visible stays true the whole time, exactly like the real fast
    // double-tap this guards against). The guard is a synchronous ref
    // check, so it holds whether or not React commits a render between
    // the two presses; each is a separate act() so they don't overlap.
    await tap(view.getByText(CONFIRM_LABEL));
    await tap(view.getByText(CONFIRM_LABEL));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('resets the guard when the sheet reopens (visible flips true again)', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await render(
      <Providers>
        <ConfirmSheet
          visible
          onClose={onClose}
          onConfirm={onConfirm}
          title="Stop breaking this habit?"
          body="You can start it again anytime."
          confirmLabel={CONFIRM_LABEL}
          cancelLabel={CANCEL_LABEL}
        />
      </Providers>
    );

    await tap(view.getByText(CONFIRM_LABEL));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Close, then reopen: a fresh confirm should not be swallowed by the
    // previous open's guard.
    await view.rerender(
      <Providers>
        <ConfirmSheet
          visible={false}
          onClose={onClose}
          onConfirm={onConfirm}
          title="Stop breaking this habit?"
          body="You can start it again anytime."
          confirmLabel={CONFIRM_LABEL}
          cancelLabel={CANCEL_LABEL}
        />
      </Providers>
    );
    await view.rerender(
      <Providers>
        <ConfirmSheet
          visible
          onClose={onClose}
          onConfirm={onConfirm}
          title="Stop breaking this habit?"
          body="You can start it again anytime."
          confirmLabel={CONFIRM_LABEL}
          cancelLabel={CANCEL_LABEL}
        />
      </Providers>
    );

    await tap(view.getByText(CONFIRM_LABEL));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('ignores a cancel press that lands after confirm already fired', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await render(
      <Providers>
        <ConfirmSheet
          visible
          onClose={onClose}
          onConfirm={onConfirm}
          title="Stop breaking this habit?"
          body="You can start it again anytime."
          confirmLabel={CONFIRM_LABEL}
          cancelLabel={CANCEL_LABEL}
        />
      </Providers>
    );

    await tap(view.getByText(CONFIRM_LABEL));
    await tap(view.getByText(CANCEL_LABEL));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a cancel press with no prior confirm still calls onClose', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = await render(
      <Providers>
        <ConfirmSheet
          visible
          onClose={onClose}
          onConfirm={onConfirm}
          title="Stop breaking this habit?"
          body="You can start it again anytime."
          confirmLabel={CONFIRM_LABEL}
          cancelLabel={CANCEL_LABEL}
        />
      </Providers>
    );

    await tap(view.getByText(CANCEL_LABEL));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
