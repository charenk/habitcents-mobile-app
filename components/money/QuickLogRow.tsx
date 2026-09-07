/**
 * QuickLogRow (redesign U5, ADR 0019, DI-5): the amount-first quick log,
 * the Spent pane's dock content. Both halves open the log sheet.
 *
 * Since 2026-09-07 it is built on DockCard, the shell it shares with the
 * Kept pane's BreakHabitRow, so the two docks are one structure at one
 * height. The geometry that used to live here (a card at the chips track's
 * radius 23, a field at 13 derived concentrically) went with that change:
 * the card and the chips no longer adjoin, and Charen asked for the docks to
 * be fully round. See DockCard for the shared numbers and their derivation.
 *
 * The five-category-tile row that once gated behind `showCategoryTiles`
 * shipped false and was removed (U13, 2026-08-10); the sheet's own category
 * picker covers that choice.
 */
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { DockCard, DockField, DockPlusButton } from '@/components/today/DockCard';
import { strings } from '@/constants/strings';
import type { ExpenseCategory } from '@/types/expense';

export type QuickLogRowProps = {
  onOpenSheet: (category?: ExpenseCategory) => void;
};

export function QuickLogRow({ onOpenSheet }: QuickLogRowProps): React.JSX.Element {
  return (
    <DockCard testID="quick-log-card">
      {/* The enclosed field is the obvious thing to tap, so it opens the
          sheet too; the plus stays for anyone who reads it as the only
          control. */}
      <DockField
        onPress={() => onOpenSheet(undefined)}
        accessibilityLabel={strings.today.quickLogOpenLabel}
        // Distinguishes this from the empty state's identically named CTA
        // two stops earlier without changing the accessible name, so tests
        // querying by role+name still find both.
        accessibilityHint={strings.today.quickLogOpenHint}
        testID="quick-log-field"
      >
        {/* The field draws its own container fill, so the bare-number
            underline AmountDisplay defaults to would be redundant. */}
        <AmountDisplay valueCents={0} size={28} zeroAsPlaceholder underline={false} />
      </DockField>
      <DockPlusButton onPress={() => onOpenSheet(undefined)} testID="quick-log-plus" />
    </DockCard>
  );
}
