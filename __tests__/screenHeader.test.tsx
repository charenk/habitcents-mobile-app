/**
 * Rendered tests for ScreenHeader. Provider wiring mirrors
 * __tests__/uiPrimitives.test.tsx: the async-storage mock plus ThemeProvider,
 * plus SafeAreaProvider now that the pushed-route (onBack) mode reads
 * useSafeAreaInsets directly instead of trusting a parent container's
 * padding (design/header-unification U1: that trust is what let the old
 * native transparent header overlap the title).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { strings } from '@/constants/strings';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('ScreenHeader', () => {
  it('renders the title as the header', async () => {
    const view = await render(
      <Providers>
        <ScreenHeader title="Today." />
      </Providers>
    );
    const title = await view.findByText('Today.');
    expect(title).toBeTruthy();
    expect(title.props.accessibilityRole).toBe('header');
  });

  // UX-060: the eyebrow is still uppercase on screen, but the transform now
  // lives in the STYLE rather than a JS .toUpperCase() on the string, so the
  // text node keeps its sentence case and a screen reader reads it as words
  // rather than spelling out letters. This asserts both halves: the readable
  // string and the visual uppercase.
  it('renders the eyebrow only when passed, uppercased by style not by string', async () => {
    const withEyebrow = await render(
      <Providers>
        <ScreenHeader title="Today." eyebrow="Thursday, July 24" />
      </Providers>
    );
    const eyebrow = await withEyebrow.findByText('Thursday, July 24');
    expect(eyebrow).toBeTruthy();
    expect(StyleSheet.flatten(eyebrow.props.style).textTransform).toBe('uppercase');
    // The pre-uppercased string must NOT be what lands in the tree.
    expect(withEyebrow.queryByText('THURSDAY, JULY 24')).toBeNull();

    const withoutEyebrow = await render(
      <Providers>
        <ScreenHeader title="Money." />
      </Providers>
    );
    expect(await withoutEyebrow.findByText('Money.')).toBeTruthy();
    expect(withoutEyebrow.queryByText('Thursday, July 24')).toBeNull();
  });

  it('renders actions as buttons with their labels and fires onPress', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Providers>
        <ScreenHeader
          title="Categories."
          actions={[{ icon: 'Plus', label: 'Add category', onPress }]}
        />
      </Providers>
    );
    const button = await view.findByRole('button', { name: 'Add category' });
    expect(button).toBeTruthy();
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders multiple actions independently', async () => {
    const onPressA = jest.fn();
    const onPressB = jest.fn();
    const view = await render(
      <Providers>
        <ScreenHeader
          title="Today."
          actions={[
            { icon: 'Settings2', label: 'Settings', onPress: onPressA },
            { icon: 'Plus', label: 'Add', onPress: onPressB },
          ]}
        />
      </Providers>
    );
    fireEvent.press(await view.findByRole('button', { name: 'Settings' }));
    fireEvent.press(await view.findByRole('button', { name: 'Add' }));
    expect(onPressA).toHaveBeenCalledTimes(1);
    expect(onPressB).toHaveBeenCalledTimes(1);
  });

  // Pushed-route mode (profile, habit detail, category detail): the back
  // pill button sits ahead of the title and fires onBack. This is the fix
  // for the iPhone 13 overlap bug (design/header-unification U1) that used
  // to live behind a native transparent Stack.Screen header.
  it('renders a back button ahead of the title and fires onBack when onBack is passed', async () => {
    const onBack = jest.fn();
    const view = await render(
      <Providers>
        <ScreenHeader title="Profile." onBack={onBack} />
      </Providers>
    );

    const backButton = await view.findByRole('button', { name: strings.common.back });
    expect(backButton).toBeTruthy();
    fireEvent.press(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);

    const title = await view.findByText('Profile.');
    expect(title.props.accessibilityRole).toBe('header');
    expect(title.props.maxFontSizeMultiplier).toBe(1.5);
  });

  it('renders no back button when onBack is not passed', async () => {
    const view = await render(
      <Providers>
        <ScreenHeader title="Today." />
      </Providers>
    );
    expect(view.queryByLabelText(strings.common.back)).toBeNull();
  });

  it('renders a title-less back-only header, for not-found branches', async () => {
    const onBack = jest.fn();
    const view = await render(
      <Providers>
        <ScreenHeader onBack={onBack} />
      </Providers>
    );

    const backButton = await view.findByRole('button', { name: strings.common.back });
    fireEvent.press(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
