/**
 * Rendered tests for the WP-2 shared primitives (Button, EmojiTile,
 * AmountDisplay). Provider wiring mirrors __tests__/renderedA11y.test.tsx:
 * the async-storage mock plus ThemeProvider > CurrencyProvider.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { withAlpha } from '@/utils/color';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}

describe('Button', () => {
  it('renders its label', async () => {
    const view = await render(
      <Providers>
        <Button label="Log it" onPress={() => {}} />
      </Providers>
    );
    expect(await view.findByText('Log it')).toBeTruthy();
  });

  it('fires onPress when enabled', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Providers>
        <Button label="Save" onPress={onPress} />
      </Providers>
    );
    fireEvent.press(await view.findByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks onPress and marks disabled state when disabled', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Providers>
        <Button label="Save" onPress={onPress} disabled />
      </Providers>
    );
    const button = await view.findByRole('button');
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('renders every variant', async () => {
    const variants: ButtonVariant[] = [
      'primary',
      'secondary',
      'tertiary',
      'destructive',
      'destructiveFill',
    ];
    for (const variant of variants) {
      const view = await render(
        <Providers>
          <Button label={variant} onPress={() => {}} variant={variant} />
        </Providers>
      );
      expect(await view.findByText(variant)).toBeTruthy();
    }
  });
});

describe('EmojiTile', () => {
  it('fills with the category color at 12% alpha', async () => {
    const color = '#FF6B6B';
    const view = await render(
      <Providers>
        <EmojiTile emoji="🍔" color={color} accessibilityLabel="Food" />
      </Providers>
    );
    const tile = await view.findByLabelText('Food');
    const flat = StyleSheet.flatten(tile.props.style);
    expect(flat.backgroundColor).toBe(withAlpha(color, 0.12));
  });

  it('renders the emoji', async () => {
    const view = await render(
      <Providers>
        <EmojiTile emoji="🍔" color="#FF6B6B" accessibilityLabel="Food" />
      </Providers>
    );
    expect(await view.findByText('🍔')).toBeTruthy();
  });
});

describe('AmountDisplay', () => {
  it('renders the currency symbol and the formatted value', async () => {
    const view = await render(
      <Providers>
        <AmountDisplay valueCents={650} />
      </Providers>
    );
    // Default currency is USD.
    expect(await view.findByText('$')).toBeTruthy();
    expect(view.getByText('6.50')).toBeTruthy();
  });

  it('renders a zero as a placeholder value', async () => {
    const view = await render(
      <Providers>
        <AmountDisplay valueCents={0} zeroAsPlaceholder />
      </Providers>
    );
    expect(await view.findByText('0.00')).toBeTruthy();
  });

  it('shrink-wraps the digits by default (alignSelf flex-start)', async () => {
    const view = await render(
      <Providers>
        <AmountDisplay valueCents={0} zeroAsPlaceholder />
      </Providers>
    );
    const number = await view.findByText('0.00');
    // number Text -> row View -> column View (the component's own root).
    const column = number.parent?.parent;
    const flat = StyleSheet.flatten(column?.props.style);
    expect(flat.alignSelf).toBe('flex-start');
  });

  it('stretches to the parent width when fullWidth is set, so the underline spans the container', async () => {
    const view = await render(
      <Providers>
        <AmountDisplay valueCents={0} zeroAsPlaceholder fullWidth />
      </Providers>
    );
    const number = await view.findByText('0.00');
    const column = number.parent?.parent;
    const flat = StyleSheet.flatten(column?.props.style);
    expect(flat.alignSelf).toBe('stretch');
  });
});
