/**
 * ActionDock (ADR 0038) and the tertiaryBrand Button variant (ADR 0038): the
 * pieces of the dock work that only had placement coverage via the Today
 * suite. The variant lookup in Button is string-built (styles[`${variant}...`])
 * so a rename fails at runtime, not compile time; these pin it.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { Text } from 'react-native';
import { act, cleanup, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ActionDock } from '@/components/today/ActionDock';
import { Button } from '@/components/ui/Button';
import { lightTheme } from '@/constants/theme';

async function renderWith(node: React.ReactElement) {
  const view = await render(<ThemeProvider>{node}</ThemeProvider>);
  await act(async () => {});
  return view;
}

afterEach(cleanup);

function styleOf(node: { props: Record<string, unknown> }): Record<string, unknown> {
  const style = node.props.style;
  const parts = (Array.isArray(style) ? style.flat(Infinity) : [style]) as unknown[];
  return Object.assign({}, ...parts.filter(Boolean));
}

describe('ActionDock', () => {
  it('renders its children inside the dock', async () => {
    const view = await renderWith(
      <ActionDock testID="dock">
        <Text>the action</Text>
      </ActionDock>
    );
    expect(view.getByText('the action')).toBeTruthy();
  });

  // The strip's contract: a top hairline so scrolling content clips cleanly
  // against it, and NO bottom safe-area padding, because the tab bar below
  // already reserves the inset and draws its own border. Doubling either was
  // the failure mode the ADR names.
  it('carries a top hairline and no bottom safe-area padding', async () => {
    const view = await renderWith(
      <ActionDock testID="dock">
        <Text>x</Text>
      </ActionDock>
    );
    const dock = styleOf(view.getByTestId('dock'));

    expect(dock.borderTopWidth).toBe(1);
    expect(dock.borderTopColor).toBe(lightTheme.border);
    // 12pt of its own padding, not an inset-derived value.
    expect(dock.paddingBottom).toBe(12);
    expect(dock.paddingTop).toBe(12);
  });

  it('reports its measured height through onHeightChange', async () => {
    const onHeightChange = jest.fn();
    const view = await renderWith(
      <ActionDock testID="dock" onHeightChange={onHeightChange}>
        <Text>x</Text>
      </ActionDock>
    );
    await act(async () => {
      view.getByTestId('dock').props.onLayout({ nativeEvent: { layout: { height: 88 } } });
    });
    expect(onHeightChange).toHaveBeenCalledWith(88);
  });
});

describe('Button tertiaryBrand', () => {
  // The empty-state CTA's variant (ADR 0038): sage text on nothing, 44pt
  // floor. Pinned because slate-vs-sage is the entire difference from
  // tertiary, and the style keys are looked up by constructed name.
  it('is transparent, 44pt, with a sage label', async () => {
    const view = await renderWith(
      <Button variant="tertiaryBrand" label="Log an expense" onPress={() => {}} />
    );
    const label = view.getByText('Log an expense');
    const labelStyle = styleOf(label);

    expect(labelStyle.color).toBe(lightTheme.primary);
    const pressable = view.getByRole('button');
    const boxStyle = styleOf(pressable);
    expect(boxStyle.minHeight).toBe(44);
    expect(boxStyle.backgroundColor).toBe('transparent');
  });
});
