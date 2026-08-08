/**
 * Rendered tests for ScreenHeader. Provider wiring mirrors
 * __tests__/uiPrimitives.test.tsx: the async-storage mock plus ThemeProvider.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
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

  it('renders the eyebrow, uppercased, only when passed', async () => {
    const withEyebrow = await render(
      <Providers>
        <ScreenHeader title="Today." eyebrow="Thursday, July 24" />
      </Providers>
    );
    expect(await withEyebrow.findByText('THURSDAY, JULY 24')).toBeTruthy();

    const withoutEyebrow = await render(
      <Providers>
        <ScreenHeader title="Money." />
      </Providers>
    );
    expect(await withoutEyebrow.findByText('Money.')).toBeTruthy();
    expect(withoutEyebrow.queryByText('THURSDAY, JULY 24')).toBeNull();
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
});
