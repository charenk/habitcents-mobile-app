/**
 * Rendered tests for the WP-2 shared primitives (Button, EmojiTile,
 * AmountDisplay, TextField). Provider wiring mirrors
 * __tests__/renderedA11y.test.tsx: the async-storage mock plus
 * ThemeProvider > CurrencyProvider.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { TextField } from '@/components/ui/TextField';
import { lightTheme } from '@/constants/theme';
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

  it('renders no underline when underline is false', async () => {
    const view = await render(
      <Providers>
        <AmountDisplay valueCents={0} zeroAsPlaceholder underline={false} />
      </Providers>
    );
    await view.findByText('0.00');
    // The underline is a View with no other identifying prop, so search the
    // whole tree for its distinctive shape (a 1.5pt-tall pill-radius rule)
    // rather than depending on where it sits in the nesting.
    const underlines = view.container.queryAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.height === 1.5 && style?.borderRadius === 999;
    });
    expect(underlines).toHaveLength(0);
  });
});

describe('TextField', () => {
  it('renders its value', async () => {
    const view = await render(
      <Providers>
        <TextField value="Starbucks" onChangeText={() => {}} accessibilityLabel="Merchant" />
      </Providers>
    );
    expect(await view.findByDisplayValue('Starbucks')).toBeTruthy();
  });

  it('carries a cloud border at rest and turns it sage on focus', async () => {
    const view = await render(
      <Providers>
        <TextField value="" onChangeText={() => {}} accessibilityLabel="Merchant" />
      </Providers>
    );
    const field = await view.findByLabelText('Merchant');

    const resting = StyleSheet.flatten(field.props.style);
    expect(resting.borderColor).toBe(lightTheme.cloud);
    expect(resting.borderWidth).toBe(1.5);

    await act(async () => {
      fireEvent(field, 'focus');
    });
    const focused = StyleSheet.flatten(field.props.style);
    expect(focused.borderColor).toBe(lightTheme.primary);
    // Border width never changes between states, so focus never nudges layout.
    expect(focused.borderWidth).toBe(1.5);

    await act(async () => {
      fireEvent(field, 'blur');
    });
    const blurred = StyleSheet.flatten(field.props.style);
    expect(blurred.borderColor).toBe(lightTheme.cloud);
  });

  // UX-003: placeholder copy is text, so it takes mistText (4.78:1), not the
  // decorative-fill mist (2.95:1). The "ignore the caller's override" contract
  // is the point of the test and is unchanged; only which token wins moved.
  it('uses the text-grade neutral for placeholder text, ignoring any caller override', async () => {
    const view = await render(
      <Providers>
        <TextField
          value=""
          onChangeText={() => {}}
          placeholder="Enter category name"
          placeholderTextColor="#FF0000"
          accessibilityLabel="Category name"
        />
      </Providers>
    );
    const field = await view.findByLabelText('Category name');
    expect(field.props.placeholderTextColor).toBe(lightTheme.mistText);
  });
});
