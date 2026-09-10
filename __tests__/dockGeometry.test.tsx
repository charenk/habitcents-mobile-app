/**
 * The two Today docks are one structure (Charen, 2026-09-07).
 *
 * Spent's QuickLogRow and Kept's BreakHabitRow both build on DockCard. What
 * this file pins is the thing Charen circled: that a swipe between the panes
 * lands on the same shell at the same height, in every state the Kept row
 * can be in. The numbers themselves are DockCard's; the tests read them from
 * there rather than repeating them, so moving the constant moves the tests.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { QuickLogRow } from '@/components/money/QuickLogRow';
import { BreakHabitRow } from '@/components/today/BreakHabitRow';
import {
  DOCK_FIELD_HEIGHT,
  DOCK_LABEL_LINE_HEIGHT,
  DOCK_SHELL_HEIGHT,
} from '@/components/today/DockCard';
import { strings } from '@/constants/strings';
import { radii, spacing, lightTheme } from '@/constants/theme';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}

/** RN flattens style arrays only on request; nulls are dropped by the renderer. */
function flat(node: { props: Record<string, unknown> }): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

const FIRST = strings.today.breakFirstHabitCta;
const ANOTHER = strings.today.breakAnotherHabitCta;

describe('Today docks: one shell, one height', () => {
  it('gives both fields the same fixed height, whichever label Kept carries', async () => {
    const spent = await render(
      <Providers>
        <QuickLogRow onOpenSheet={() => {}} />
      </Providers>
    );
    const keptFirst = await render(
      <Providers>
        <BreakHabitRow label={FIRST} onPress={() => {}} />
      </Providers>
    );
    const keptAnother = await render(
      <Providers>
        <BreakHabitRow label={ANOTHER} onPress={() => {}} />
      </Providers>
    );

    expect(flat(spent.getByTestId('quick-log-field')).height).toBe(DOCK_FIELD_HEIGHT);
    expect(flat(keptFirst.getByTestId('break-habit-affordance')).height).toBe(DOCK_FIELD_HEIGHT);
    expect(flat(keptAnother.getByTestId('break-habit-affordance')).height).toBe(DOCK_FIELD_HEIGHT);
  });

  it('fits the Kept label inside the fixed height at the 1.5 chrome cap', () => {
    // The label scales to 1.5x under Dynamic Type. If a future line height
    // pushes it past the field, the text clips on Android and spills on iOS,
    // so the arithmetic is pinned here rather than discovered on a device.
    expect(1.5 * DOCK_LABEL_LINE_HEIGHT).toBeLessThanOrEqual(DOCK_FIELD_HEIGHT);
    // Since 2026-09-10 the caption is gone, so Kept no longer sets the floor.
    // Two things do, and both land on 44: Spent's 28pt amount at
    // AmountDisplay's 1.3 cap, and the touch-target minimum. The field is
    // therefore allowed to be exactly 44 and never less.
    expect(DOCK_FIELD_HEIGHT).toBeGreaterThanOrEqual(44);
  });

  it('draws both fields at the concentric radius, fills only Spent, and rounds both plus buttons', async () => {
    const spent = await render(
      <Providers>
        <QuickLogRow onOpenSheet={() => {}} />
      </Providers>
    );
    const kept = await render(
      <Providers>
        <BreakHabitRow label={FIRST} onPress={() => {}} />
      </Providers>
    );

    const spentField = flat(spent.getByTestId('quick-log-field'));
    const keptField = flat(kept.getByTestId('break-habit-affordance'));

    // Concentric with the shell: radii.feature minus the shell's own padding
    // is exactly radii.control, so the curves stay parallel.
    for (const field of [spentField, keptField]) {
      expect(field.borderRadius).toBe(radii.control);
      expect(radii.feature - spacing.control).toBe(radii.control);
    }
    // Only the composer carries a resting fill; Kept is border only
    // (Charen, 2026-09-10).
    expect(spentField.backgroundColor).toBe(lightTheme.snow);
    expect(keptField.backgroundColor).toBe('transparent');
    for (const plus of [
      flat(spent.getByTestId('quick-log-plus', { includeHiddenElements: true })),
      flat(kept.getByTestId('break-habit-plus', { includeHiddenElements: true })),
    ]) {
      expect(plus.borderRadius).toBe(radii.pill);
      expect(plus.aspectRatio).toBe(1);
      expect(plus.alignSelf).toBe('stretch');
    }
  });

  // Same structure, two skins (Charen, 2026-09-07): Spent is the solid
  // composer with the filled sage plus; Kept is the dashed "add another"
  // shell with a plain snow plus. The height must not move between them,
  // so the dashed tone pays for its thicker edge out of its padding.
  it('skins the Kept dock dashed and plain without changing its height', async () => {
    const spent = await render(
      <Providers>
        <QuickLogRow onOpenSheet={() => {}} />
      </Providers>
    );
    const kept = await render(
      <Providers>
        <BreakHabitRow label={FIRST} onPress={() => {}} />
      </Providers>
    );

    const spentCard = flat(spent.getByTestId('quick-log-card'));
    const keptCard = flat(kept.getByTestId('break-habit-card'));

    expect(spentCard.borderStyle).toBeUndefined();
    expect(spentCard.borderWidth).toBe(1);
    expect(spentCard.borderColor).toBe(lightTheme.border);
    expect(spentCard.padding).toBe(spacing.control);

    expect(keptCard.borderStyle).toBe('dashed');
    expect(keptCard.borderWidth).toBe(1.5);
    expect(keptCard.borderColor).toBe(lightTheme.cloudDashed);
    expect(keptCard.padding).toBe(spacing.control - 0.5);

    for (const card of [spentCard, keptCard]) {
      expect(card.borderRadius).toBe(radii.feature);
      expect(card.backgroundColor).toBe(lightTheme.white);
      const outer = 2 * (card.borderWidth as number) + 2 * (card.padding as number) + DOCK_FIELD_HEIGHT;
      expect(outer).toBe(DOCK_SHELL_HEIGHT);
    }

    const spentPlus = flat(spent.getByTestId('quick-log-plus', { includeHiddenElements: true }));
    const keptPlus = flat(kept.getByTestId('break-habit-plus', { includeHiddenElements: true }));
    expect(spentPlus.backgroundColor).toBe(lightTheme.primary);
    expect(keptPlus.backgroundColor).toBe('transparent');
  });

  it('keeps the Kept dock to one spoken control carrying its label', async () => {
    const plain = await render(
      <Providers>
        <BreakHabitRow label={FIRST} onPress={() => {}} />
      </Providers>
    );
    // The plus is hidden from assistive tech, as on Spent (UX-055), so the
    // label is announced once.
    expect(plain.getAllByLabelText(FIRST)).toHaveLength(1);
    expect(plain.queryByTestId('break-habit-plus')).toBeNull();

    const another = await render(
      <Providers>
        <BreakHabitRow label={ANOTHER} onPress={() => {}} />
      </Providers>
    );
    expect(another.getAllByLabelText(ANOTHER)).toHaveLength(1);
    // Nothing under the label any more: the free-plan caption is gone and
    // must not creep back into the spoken name.
    expect(another.queryByText(strings.habitLogging.freeTierNote)).toBeNull();
  });

  it('opens from either half of the Kept dock', async () => {
    const onPress = jest.fn();
    const view = await render(
      <Providers>
        <BreakHabitRow label={FIRST} onPress={onPress} />
      </Providers>
    );
    fireEvent.press(view.getByTestId('break-habit-affordance'));
    fireEvent.press(view.getByTestId('break-habit-plus', { includeHiddenElements: true }));
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});
