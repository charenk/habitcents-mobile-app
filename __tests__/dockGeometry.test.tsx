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
  DOCK_CAPTION_LINE_HEIGHT,
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
const CAPTION = strings.habitLogging.freeTierNote;

describe('Today docks: one shell, one height', () => {
  it('gives both fields the same fixed height, captioned or not', async () => {
    const spent = await render(
      <Providers>
        <QuickLogRow onOpenSheet={() => {}} />
      </Providers>
    );
    const keptPlain = await render(
      <Providers>
        <BreakHabitRow label={FIRST} onPress={() => {}} />
      </Providers>
    );
    const keptCaptioned = await render(
      <Providers>
        <BreakHabitRow label={ANOTHER} caption={CAPTION} onPress={() => {}} />
      </Providers>
    );

    const spentField = flat(spent.getByTestId('quick-log-field'));
    const plainField = flat(keptPlain.getByTestId('break-habit-affordance'));
    const captionedField = flat(keptCaptioned.getByTestId('break-habit-affordance'));

    expect(spentField.height).toBe(DOCK_FIELD_HEIGHT);
    expect(plainField.height).toBe(DOCK_FIELD_HEIGHT);
    // The ceiling case adds a second line and must not grow the dock.
    expect(captionedField.height).toBe(DOCK_FIELD_HEIGHT);
  });

  it('fits the captioned Kept field inside the fixed height at the 1.5 chrome cap', () => {
    // Label and caption both scale up to 1.5x under Dynamic Type. If a
    // future line height pushes this past the field, the text clips on
    // Android and spills on iOS, so the arithmetic is pinned here rather than
    // discovered on a device.
    const tallest = 1.5 * (DOCK_LABEL_LINE_HEIGHT + DOCK_CAPTION_LINE_HEIGHT) + spacing.hairline;
    expect(tallest).toBeLessThanOrEqual(DOCK_FIELD_HEIGHT);
    // And the field clears the 44pt target floor on its own.
    expect(DOCK_FIELD_HEIGHT).toBeGreaterThanOrEqual(44);
  });

  it('draws both fields as snow pills, and both plus buttons as circles of the same size', async () => {
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

    for (const field of [
      flat(spent.getByTestId('quick-log-field')),
      flat(kept.getByTestId('break-habit-affordance')),
    ]) {
      expect(field.borderRadius).toBe(radii.pill);
      expect(field.backgroundColor).toBe(lightTheme.snow);
    }
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
      expect(card.borderRadius).toBe(radii.pill);
      expect(card.backgroundColor).toBe(lightTheme.white);
      const outer = 2 * (card.borderWidth as number) + 2 * (card.padding as number) + DOCK_FIELD_HEIGHT;
      expect(outer).toBe(DOCK_SHELL_HEIGHT);
    }

    const spentPlus = flat(spent.getByTestId('quick-log-plus', { includeHiddenElements: true }));
    const keptPlus = flat(kept.getByTestId('break-habit-plus', { includeHiddenElements: true }));
    expect(spentPlus.backgroundColor).toBe(lightTheme.primary);
    expect(keptPlus.backgroundColor).toBe(lightTheme.snow);
  });

  it('keeps the Kept dock to one spoken control, with the caption folded into its name', async () => {
    const plain = await render(
      <Providers>
        <BreakHabitRow label={FIRST} onPress={() => {}} />
      </Providers>
    );
    // The plus is hidden from assistive tech, as on Spent (UX-055), so the
    // label is announced once.
    expect(plain.getAllByLabelText(FIRST)).toHaveLength(1);
    expect(plain.queryByTestId('break-habit-plus')).toBeNull();

    const captioned = await render(
      <Providers>
        <BreakHabitRow label={ANOTHER} caption={CAPTION} onPress={() => {}} />
      </Providers>
    );
    expect(captioned.getAllByLabelText(`${ANOTHER}, ${CAPTION}`)).toHaveLength(1);
    expect(captioned.getByText(CAPTION)).toBeTruthy();
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
