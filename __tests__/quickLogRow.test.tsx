/**
 * QuickLogRow (components/money/QuickLogRow.tsx): the Spent pane's dock
 * content, built on the DockCard shell it shares with the Kept pane's
 * BreakHabitRow since 2026-09-07. The $0.00 sits in a snow pill field of a
 * fixed height, beside a round sage plus that stretches to that height.
 * The geometry this file used to derive (a card at the chips track's radius
 * and a concentric field) is gone with the shell; the shared numbers live in
 * DockCard and are pinned as a pair in __tests__/dockGeometry.test.tsx.
 * See __tests__/uiPrimitives.test.tsx for the AmountDisplay underline={false}
 * prop-level assertion this wiring depends on.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { QuickLogRow } from '@/components/money/QuickLogRow';
import { DOCK_FIELD_HEIGHT } from '@/components/today/DockCard';
import { strings } from '@/constants/strings';
import { radii, lightTheme } from '@/constants/theme';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

describe('QuickLogRow', () => {
  it('renders the field as a snow-filled rounded rect at the shared dock height, with no underline', async () => {
    const view = await render(
      <Providers>
        <QuickLogRow onOpenSheet={() => {}} />
      </Providers>
    );
    const field = view.getByTestId('quick-log-field');
    const flat = StyleSheet.flatten(field.props.style);
    expect(flat.backgroundColor).toBe(lightTheme.snow);
    // Concentric with the shell since 2026-09-10: radii.feature outside,
    // radii.control inside, which is the shell's radius minus its padding.
    expect(flat.borderRadius).toBe(radii.control);
    // Fixed, not a minimum: the two docks are equal because their fields are
    // the same fixed height, whatever each one holds.
    expect(flat.height).toBe(DOCK_FIELD_HEIGHT);
    // Press feedback: the field had no pressed style at all, so the primary
    // entry to the core loop acknowledged a touch with nothing until the sheet
    // began to rise. It now takes Button.tsx's stated convention, a pressed
    // background swap. Asserted as shape rather than colour on purpose: RNTL
    // resolves the ({ pressed }) callback before the test sees the element and
    // Pressability's pressed state does not flip under fireEvent (checked with
    // and without fake timers), so a control WITH feedback renders
    // [resting, null] while a static one renders a bare object. That is the
    // regression worth guarding, since the defect was the absence of feedback.
    expect(Array.isArray(field.props.style)).toBe(true);
    expect(view.queryByText('0.00')).toBeTruthy();
    // The old bare-number underline is gone: AmountDisplay is passed
    // underline={false}, so no view anywhere in the tree carries the
    // underline's distinctive shape (a 1.5pt-tall pill-radius rule). The
    // field is a pill too now, but at 52pt tall it cannot match this
    // fingerprint, which needs both the radius and the 1.5pt height.
    const underlines = view.container.queryAll((node) => {
      const style = StyleSheet.flatten(node.props?.style);
      return style?.height === 1.5 && style?.borderRadius === 999;
    });
    expect(underlines).toHaveLength(0);
  });

  it('renders the plus button as a sage circle stretched to the field height', async () => {
    const view = await render(
      <Providers>
        <QuickLogRow onOpenSheet={() => {}} />
      </Providers>
    );
    const plusButton = view.getByTestId('quick-log-plus', { includeHiddenElements: true });
    const flat = StyleSheet.flatten(plusButton.props.style);
    expect(flat.borderRadius).toBe(radii.pill);
    expect(flat.alignSelf).toBe('stretch');
    // Squares its width off the stretched height, so it stays a circle
    // rather than pinning a width the field's height might not match.
    expect(flat.aspectRatio).toBe(1);
    expect(flat.backgroundColor).toBe(lightTheme.primary);
    // Was a TouchableOpacity on its default activeOpacity fade, so the two
    // halves of one affordance answered a touch differently and neither used
    // the house swap. Now a Pressable on primaryPressedBg. Same shape assertion
    // and same reason as the field above.
    expect(Array.isArray(plusButton.props.style)).toBe(true);
  });

  it('exposes exactly one accessible control for the log action, and both the amount card and the plus button still open the sheet by touch (UX-055)', async () => {
    // UX-055: the amount Pressable and the plus TouchableOpacity used to
    // share strings.today.quickLogOpenLabel, so VoiceOver announced the same
    // button twice in a row. The plus button is now hidden from the
    // accessibility tree (accessible={false}); only the amount tap area is
    // discoverable by assistive tech, though both remain live touch targets.
    const onOpenSheet = jest.fn();
    const view = await render(
      <Providers>
        <QuickLogRow onOpenSheet={onOpenSheet} />
      </Providers>
    );
    const targets = await view.findAllByLabelText(strings.today.quickLogOpenLabel);
    expect(targets).toHaveLength(1);
    fireEvent.press(targets[0]);
    expect(onOpenSheet).toHaveBeenCalledTimes(1);
    expect(onOpenSheet).toHaveBeenCalledWith(undefined);

    // The plus button is still a real touch target; it is only hidden from
    // assistive tech (RNTL's queries exclude accessibility-hidden elements
    // by default, hence includeHiddenElements here), not removed from the
    // tree or made non-functional.
    const plusButton = view.getByTestId('quick-log-plus', { includeHiddenElements: true });
    fireEvent.press(plusButton);
    expect(onOpenSheet).toHaveBeenCalledTimes(2);
  });
});
