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
import { AddCategoryModal } from '@/components/AddCategoryModal';
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

  it('save is disabled until a name is entered, and calls onSave with no budget argument', async () => {
    const { view, onSave, onClose } = await renderModal();

    // Empty name: Save is disabled, so pressing it does nothing.
    await act(async () => {
      fireEvent.press(view.getByText(strings.common.save));
    });
    expect(onSave).not.toHaveBeenCalled();

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

  it('cancel closes without saving', async () => {
    const { view, onSave, onClose } = await renderModal();

    await act(async () => {
      fireEvent.press(view.getByText(strings.common.cancel));
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
