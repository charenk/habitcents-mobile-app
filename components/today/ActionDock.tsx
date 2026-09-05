/**
 * ActionDock (ADR 0038): the one place Today's panes put their action.
 *
 * Before this, the two panes disagreed about where the primary action lives.
 * Spent kept the quick-log card as the FIRST child of its scroller, pinned
 * under the chips; Kept put "Break another habit" LAST, after the leaks and
 * the check-in card. Swiping between them moved the action from the top of the
 * screen to the bottom of a long scroll, and on a populated Kept pane the
 * affordance could not be reached at all without scrolling to the end.
 *
 * This is the shared container, not the contents: it owns the position, the
 * padding and the top edge so both panes match while the pager is mid-swipe.
 * Spent fills it with QuickLogRow; Kept fills it with the break-habit
 * affordance. It also executes a principle the repo already states in
 * CLAUDE.md, "Primary actions in thumb zone (bottom 40%)".
 *
 * A FLEX SIBLING, NOT A FLOATING BAR. The pane is a column: the scroller takes
 * flex 1 and this sits after it. No position absolute, no z-index, no offset
 * arithmetic against the tab bar, and no bottom padding on the scroll content
 * to stop things hiding underneath, because the scroller's height already
 * excludes this. The Kept pane was already shaped this way for its hero band.
 *
 * NO BOTTOM SAFE-AREA PADDING. The tab bar below already reserves the inset and
 * draws its own top border, so adding either here would double them.
 *
 * IT DOES NOT HIDE ON SCROLL, and that is a decision rather than an omission
 * (ADR 0038). A quick-log row is a composer, and composers stay put. The five
 * specific reasons, since the question will come up again: there is no
 * scroll-driven UI anywhere in this app; a smooth version needs the first
 * react-native-reanimated import in a codebase with an open, unexplained
 * release-only launch crash; the toast occupies this exact band and fires on
 * the very save this dock performs; the sanctioned entrance travel is 8-12pt
 * against a bar height of ~80; and the house rejected sliding surfaces twice,
 * most recently in ADR 0037.
 *
 * Geometry follows the leak-scan footers (components/leak-scan/BillsScreen.tsx)
 * so this is a re-use, not a new chrome pattern.
 */
import { useCallback, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, type AppTheme } from '@/constants/theme';

export type ActionDockProps = {
  children: ReactNode;
  /**
   * Measured height, reported so the screen can lift the toast clear of it
   * (ADR 0038, see Toast's useToastLift). Measured rather than derived: the
   * dock's height is its content's, and the quick-log card and the habit
   * affordance are not the same size.
   */
  onHeightChange?: (height: number) => void;
  /** Distinguishes the two panes' docks in tests. */
  testID?: string;
};

export function ActionDock({ children, onHeightChange, testID }: ActionDockProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onHeightChange?.(e.nativeEvent.layout.height);
    },
    [onHeightChange]
  );

  return (
    <View style={styles.dock} testID={testID} onLayout={onHeightChange ? handleLayout : undefined}>
      {children}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    dock: {
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.stack,
      paddingBottom: spacing.stack,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
  });
}
