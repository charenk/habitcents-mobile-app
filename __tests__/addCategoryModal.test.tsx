/**
 * AddCategoryModal (design/selection-sheets U3): converted off a raw Modal
 * onto the house ui/Sheet, and the monthly budget field was deleted entirely
 * per D10 (budgets removed from MVP). This pins both: no budget input exists
 * anywhere in the form, and onSave's contract is (name, icon, color) with no
 * fourth argument.
 *
 * Provider wiring mirrors __tests__/pickOneSheet.test.tsx.
 */
jest.setTimeout(20000);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AddCategoryModal } from '@/components/AddCategoryModal';
import { strings } from '@/constants/strings';
import { COLOR_OPTIONS } from '@/types/category';

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

async function renderModal(
  props: Partial<Omit<React.ComponentProps<typeof AddCategoryModal>, 'onSave' | 'onClose'>> = {}
) {
  const onSave = jest.fn();
  const onClose = jest.fn();
  const view = await render(
    <Providers>
      <AddCategoryModal visible onClose={onClose} onSave={onSave} {...props} />
    </Providers>
  );
  await act(async () => {});
  return { view, onSave, onClose };
}

afterEach(cleanup);

describe('AddCategoryModal', () => {
  it('renders the house sheet with no budget field anywhere', async () => {
    const { view } = await renderModal();

    expect(view.getByText(strings.addCategoryModal.newCategory)).toBeTruthy();
    expect(view.getByText(strings.addCategoryModal.name)).toBeTruthy();
    expect(view.getByText(strings.addCategoryModal.icon)).toBeTruthy();
    expect(view.getByText(strings.addCategoryModal.color)).toBeTruthy();
    expect(view.queryByText(/budget/i)).toBeNull();
  });

  it('save stays live on an empty name and toasts instead of saving, then calls onSave with no budget argument once named', async () => {
    // UX-021-adjacent: Save used to be disabled until a name was entered
    // (dead button, no explanation). It is now always live, matching the
    // house pattern (ExpenseSheet): an empty-name press toasts instead of
    // silently doing nothing.
    const { view, onSave, onClose } = await renderModal();

    await act(async () => {
      fireEvent.press(view.getByText(strings.common.save));
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(view.getByText(strings.toasts.enterCategoryNameFirst)).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(
        view.getByPlaceholderText(strings.addCategoryModal.namePlaceholder),
        'Groceries'
      );
    });

    await act(async () => {
      fireEvent.press(view.getByText(strings.common.save));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]).toHaveLength(3);
    expect(onSave.mock.calls[0][0]).toBe('Groceries');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the edit title and prefilled name when editing', async () => {
    const { view } = await renderModal({
      isEditing: true,
      initialName: 'Coffee',
      initialIcon: 'cafe-outline',
      initialColor: '#7E57C2',
    });

    expect(view.getByText(strings.addCategoryModal.editCategory)).toBeTruthy();
    expect(view.getByDisplayValue('Coffee')).toBeTruthy();
  });

  it('prepends a legacy stored color as the selected swatch, and picking a new color still works (review fix: orphaned swatch)', async () => {
    const legacyColor = '#7E57C2'; // predates COLOR_OPTIONS' current palette (not a member of it)
    expect(COLOR_OPTIONS).not.toContain(legacyColor);

    const { view, onSave } = await renderModal({
      isEditing: true,
      initialName: 'Coffee',
      initialIcon: 'cafe-outline',
      initialColor: legacyColor,
    });

    // UX-028: named swatches now carry hue-name labels ("coral red color"),
    // not "color option N", so swatches are selected by testID instead.
    const swatches = view.getAllByTestId(/^color-swatch-/);
    // Every house palette swatch, plus the one prepended legacy swatch.
    expect(swatches).toHaveLength(COLOR_OPTIONS.length + 1);

    // The legacy color is prepended first and rendered selected, same size.
    // It has no hue name in the lookup (it predates COLOR_OPTIONS), so it
    // keeps the old positional fallback label rather than claiming a hue.
    expect(swatches[0].props.accessibilityLabel).toBe('color option 1');
    expect(swatches[0].props.accessibilityState?.selected).toBe(true);
    // Nothing else is selected.
    for (const swatch of swatches.slice(1)) {
      expect(swatch.props.accessibilityState?.selected).toBe(false);
    }

    // Saving without touching color keeps the stored hex.
    await act(async () => {
      fireEvent.press(view.getByText(strings.common.save));
    });
    expect(onSave).toHaveBeenCalledWith('Coffee', 'cafe-outline', legacyColor);

    onSave.mockClear();

    // Picking a new (house-palette) color still works: the second swatch is
    // COLOR_OPTIONS[0], now shifted one slot by the prepended legacy swatch.
    const { view: view2, onSave: onSave2 } = await renderModal({
      isEditing: true,
      initialName: 'Coffee',
      initialIcon: 'cafe-outline',
      initialColor: legacyColor,
    });
    const swatches2 = view2.getAllByTestId(/^color-swatch-/);
    await act(async () => {
      fireEvent.press(swatches2[1]);
    });
    await act(async () => {
      fireEvent.press(view2.getByText(strings.common.save));
    });
    expect(onSave2).toHaveBeenCalledWith('Coffee', 'cafe-outline', COLOR_OPTIONS[0]);
  });

  it('does not prepend an extra swatch when the stored color is already in COLOR_OPTIONS', async () => {
    const { view } = await renderModal({
      isEditing: true,
      initialName: 'Groceries',
      initialColor: COLOR_OPTIONS[0],
    });

    const swatches = view.getAllByTestId(/^color-swatch-/);
    expect(swatches).toHaveLength(COLOR_OPTIONS.length);
    expect(swatches[0].props.accessibilityState?.selected).toBe(true);
  });

  it('cancel closes without saving', async () => {
    const { view, onSave, onClose } = await renderModal();

    await act(async () => {
      fireEvent.press(view.getByText(strings.common.cancel));
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
