/**
 * SheetHeader + Sheet drag zone (Charen's drawer feedback, 2026-09-04).
 *
 * Two things this pins: the header's one optional icon action renders with
 * a spoken label and fires (the edit expense sheet's delete rides on it),
 * and a header passed through Sheet's `header` prop lands inside the drag
 * zone, so a finger on the title row drives the same PanResponder the
 * grab handle does. The gesture arithmetic itself (25% or a 0.5 px/ms
 * flick closes, spring settle otherwise) is unchanged and untested here;
 * this protects where the gesture starts.
 *
 * Provider wiring mirrors __tests__/partialSlipSheet.test.tsx.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Sheet } from '@/components/ui/Sheet';
import { SheetHeader } from '@/components/ui/SheetHeader';

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

afterEach(cleanup);

describe('SheetHeader: optional secondary action', () => {
  it('renders nothing extra by default', async () => {
    const view = await render(
      <Providers>
        <SheetHeader title="Edit expense" saveLabel="Save" onSave={jest.fn()} />
      </Providers>
    );
    expect(view.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Delete expense' })).toBeNull();
  });

  it('renders the icon action with its spoken label, left of Save, and fires it', async () => {
    const onDelete = jest.fn();
    const view = await render(
      <Providers>
        <SheetHeader
          title="Edit expense"
          saveLabel="Save"
          onSave={jest.fn()}
          secondaryAction={{
            icon: 'Trash2',
            accessibilityLabel: 'Delete expense',
            onPress: onDelete,
            tone: 'destructive',
          }}
        />
      </Providers>
    );

    const del = view.getByRole('button', { name: 'Delete expense' });
    fireEvent.press(del);
    expect(onDelete).toHaveBeenCalledTimes(1);

    // Order: the icon action precedes Save in the tree, so it sits to the
    // left of it in the row (never flush against it: the row carries a gap).
    const buttons = view.getAllByRole('button');
    const names = buttons.map((b) => b.props.accessibilityLabel ?? '');
    expect(names.indexOf('Delete expense')).toBeLessThan(
      buttons.findIndex((b) => within(b).queryByText('Save') !== null)
    );
  });
});

describe('Sheet: header lives in the drag zone', () => {
  it('a header passed via the header prop renders inside the pan-handled zone, above the body', async () => {
    const view = await render(
      <Providers>
        <Sheet
          visible
          onClose={jest.fn()}
          header={<SheetHeader title="How much did it cost?" saveLabel="Save" onSave={jest.fn()} />}
        >
          <SheetBody />
        </Sheet>
      </Providers>
    );
    await act(async () => {});

    const zone = within(view.getByTestId('sheet-drag-zone'));
    expect(zone.getByText('How much did it cost?')).toBeTruthy();
    // The body stays outside the gesture so its own ScrollView scrolls.
    expect(zone.queryByTestId('sheet-body')).toBeNull();
    expect(view.getByTestId('sheet-body')).toBeTruthy();
  });
});

function SheetBody() {
  const { View } = require('react-native');
  return <View testID="sheet-body" />;
}
