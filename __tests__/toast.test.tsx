/**
 * Toast provider behavior (WP-3). Pins the contract useToast() exposes: a single
 * toast at a time, replacement on a second show, auto-dismiss after the default
 * 2.5s, and an action link that fires its callback. Timers are faked so the
 * enter/exit animations and the dismiss timeout are deterministic.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider, useToast, useToastLift, type ToastAction } from '@/components/ui/Toast';
import { layout } from '@/constants/theme';

const onUndo = jest.fn();

// Non-zero frame + insets so useSafeAreaInsets resolves without a live layout.
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Harness with buttons that call show() so tests drive it like a user. */
function Harness() {
  const { show } = useToast();
  const undo: ToastAction = { label: 'Undo', onPress: onUndo };
  return (
    <>
      <Pressable testID="show-a" onPress={() => show('Logged.')}>
        <Text>show a</Text>
      </Pressable>
      <Pressable testID="show-b" onPress={() => show('Saved.')}>
        <Text>show b</Text>
      </Pressable>
      <Pressable testID="show-undo" onPress={() => show('Deleted.', { action: undo })}>
        <Text>show undo</Text>
      </Pressable>
    </>
  );
}

type RenderApi = Awaited<ReturnType<typeof render>>;

// Async act flushes the passive effect that mounts the toast host and starts
// the animation; a plain synchronous act does not under fake timers.
async function press(view: RenderApi, testID: string) {
  await act(async () => {
    fireEvent.press(view.getByTestId(testID));
  });
}

// Advance past the auto-dismiss timeout plus the 220ms exit animation, flushing
// the exit effect that clears the toast.
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  onUndo.mockClear();
});

afterEach(() => {
  // Unmount while timers are still fake so pending animation frames and the
  // dismiss timeout are torn down with the tree, then clear anything left so no
  // scheduled work leaks into the next test's render.
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('ToastProvider / useToast', () => {
  it('renders the message after show()', async () => {
    const view = await render(
      <Providers>
        <Harness />
      </Providers>
    );
    await press(view, 'show-a');
    expect(view.getByText('Logged.')).toBeTruthy();
  });

  it('replaces the current toast on a second show (only one at a time)', async () => {
    const view = await render(
      <Providers>
        <Harness />
      </Providers>
    );
    await press(view, 'show-a');
    await press(view, 'show-b');
    expect(view.queryByText('Logged.')).toBeNull();
    expect(view.getByText('Saved.')).toBeTruthy();
  });

  it('auto-dismisses after the default 2500ms', async () => {
    const view = await render(
      <Providers>
        <Harness />
      </Providers>
    );
    await press(view, 'show-a');
    expect(view.getByText('Logged.')).toBeTruthy();
    // First advance fires the 2.5s dismiss timer, which starts the exit
    // animation; the second drives that animation to completion, clearing the
    // toast. They must be separate: the exit only starts once the state update
    // from the timer flushes its effect.
    await advance(2500);
    await advance(300);
    expect(view.queryByText('Logged.')).toBeNull();
  });

  // ADR 0038: Today grew an ActionDock at the bottom of each pane, which sits
  // exactly where the pill did. Without a lift, a "Logged." toast covers the
  // very field that produced it.
  describe('lift for docked chrome', () => {
    const DOCK_HEIGHT = 96;

    function Lifted({ height }: { height: number }) {
      useToastLift(height);
      return <Harness />;
    }

    /** The pill's own `bottom`, not the absolute-fill host's, which is 0. */
    function bottomOf(view: { getByTestId: (id: string) => { props: Record<string, unknown> } }) {
      const style = view.getByTestId('toast-pill').props.style;
      const parts = (Array.isArray(style) ? style.flat(Infinity) : [style]) as unknown[];
      const merged = Object.assign({}, ...parts.filter(Boolean)) as { bottom?: number };
      return merged.bottom;
    }

    it('sits at its usual spot when no screen reports docked chrome', async () => {
      const view = await render(
        <Providers>
          <Harness />
        </Providers>
      );
      await press(view, 'show-a');

      // tabBarHeight + max(inset, 8) + 0 + 24, with the 34pt inset above.
      expect(bottomOf(view)).toBe(layout.tabBarHeight + 34 + 24);
    });

    it('clears the dock by exactly its height when a screen reports one', async () => {
      const view = await render(
        <Providers>
          <Lifted height={DOCK_HEIGHT} />
        </Providers>
      );
      await press(view, 'show-a');

      expect(bottomOf(view)).toBe(layout.tabBarHeight + 34 + DOCK_HEIGHT + 24);
    });
  });

  it('renders an action label and fires its callback on press', async () => {
    const view = await render(
      <Providers>
        <Harness />
      </Providers>
    );
    await press(view, 'show-undo');
    const action = view.getByText('Undo');
    expect(action).toBeTruthy();
    await act(async () => {
      fireEvent.press(action);
    });
    expect(onUndo).toHaveBeenCalledTimes(1);
    // Action press dismisses immediately, then the callback runs.
    await advance(300);
    expect(view.queryByText('Deleted.')).toBeNull();
  });
});
