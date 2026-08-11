/**
 * AuroraBackground (components/onboarding/AuroraBackground.tsx): purely
 * decorative, so this pins the two things that would be silently regressed
 * by an innocent-looking edit: that it stays out of the accessibility tree
 * and out of touch handling entirely, and that it obeys the one-driver
 * motion rule (Animated.loop starts under normal motion, never starts under
 * reduced motion, and the loop it starts is always stopped on unmount, per
 * app/onboarding/welcome.tsx's ExampleCaption doc comment on why mixed/leaked
 * drivers matter here).
 */
const mockUseReducedMotion = jest.fn(() => false);
jest.mock('@/utils/motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

import React from 'react';
import { Animated } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuroraBackground } from '@/components/onboarding/AuroraBackground';

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  mockUseReducedMotion.mockReturnValue(false);
});

async function renderAurora() {
  return render(
    <ThemeProvider>
      <AuroraBackground />
    </ThemeProvider>
  );
}

describe('AuroraBackground', () => {
  it('renders without crashing', async () => {
    await expect(renderAurora()).resolves.toBeTruthy();
  });

  it('is hidden from touch and from accessibility', async () => {
    const view = await renderAurora();
    const root = view.toJSON();

    expect(root).not.toBeNull();
    const props = Array.isArray(root) ? root[0]?.props : root?.props;
    expect(props.pointerEvents).toBe('none');
    expect(props.importantForAccessibility).toBe('no-hide-descendants');
    expect(props.accessibilityElementsHidden).toBe(true);
  });

  it('does not start the drift loop under reduced motion', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const loopSpy = jest.spyOn(Animated, 'loop');

    await renderAurora();

    expect(loopSpy).not.toHaveBeenCalled();
  });

  it('starts the drift loop under normal motion, and stops it on unmount', async () => {
    const stop = jest.fn();
    const loopSpy = jest
      .spyOn(Animated, 'loop')
      .mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() } as unknown as Animated.CompositeAnimation);

    const view = await renderAurora();

    expect(loopSpy).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();

    await view.unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
