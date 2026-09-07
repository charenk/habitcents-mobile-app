/**
 * HowItWorksSheet: how skips and habits work, told on request.
 *
 * Opened from the underlined link on Today's Kept true-zero state. That pane
 * is the one place in the app where a user has no evidence of their own to
 * read, which is why ADR 0039 put a three-step explainer on it. Charen's call
 * on 2026-09-07 was that explanatory prose does not belong in the empty-state
 * pattern, so the explanation moved here, one tap away, and the pane went
 * back to mark, hook, one text line.
 *
 * This revives a sheet the app once had and retired (design/redesign-handoff/
 * 03-onboarding.md, "how-it-works": three icon rows and an OK). Same shape,
 * fact-checked copy (see the comment above strings.today.howItWorksRows),
 * with a fourth row on slips because "how skips and habits are measured" is
 * the question and a slip is the half people worry about.
 *
 * Modelled on ConfirmSheet's skeleton (serif title, rows, one bottom button)
 * without its confirm guard: nothing here mutates, so a double tap is just a
 * double close. Decision-sheet convention keeps the bottom button; ADR 0031's
 * "no in-sheet Cancel" is about form sheets, and "Got it" is an
 * acknowledgement, not a cancel.
 *
 * No motion of its own; Sheet's enter and exit, and its reduced-motion path,
 * are inherited.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

export type HowItWorksSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * One glyph per row, in row order, from the Icon whitelist.
 *  - Pencil: log. SquarePen is the edit-a-row glyph elsewhere; Pencil is
 *    free of that meaning.
 *  - Sprout: a leak surfaces. The growth mark InfoRibbon already uses for
 *    kept lines, so it reads as "something took root".
 *  - Check: a skip, the same mark the check-in card confirms with.
 *  - Repeat: a slip, the habit ran again. Minus would read as "subtract",
 *    which is the one thing the row says a slip never does.
 */
const ROW_ICONS: readonly IconName[] = ['Pencil', 'Sprout', 'Check', 'Repeat'];

export function HowItWorksSheet({ visible, onClose }: HowItWorksSheetProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Sheet visible={visible} onClose={onClose} accessibilityLabel={strings.today.howItWorksTitle}>
      {/* Sheet has no testID prop of its own; the wrapper carries it. */}
      <View style={styles.content} testID="how-it-works-sheet">
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
          {strings.today.howItWorksTitle}
        </Text>
        {strings.today.howItWorksRows.map((line, i) => (
          // One VoiceOver stop per row: the glyph is decorative and the line
          // is the whole meaning, so the row is the accessible element.
          <View key={i} style={styles.row} accessible accessibilityLabel={line}>
            <View style={styles.glyph}>
              <Icon name={ROW_ICONS[i] ?? 'Check'} size={28} color={theme.slate} />
            </View>
            {/* Uncapped, like EmptyState's body: this is content, and the
                only place the mechanic is explained. */}
            <Text style={styles.line}>{line}</Text>
          </View>
        ))}
        <Button
          label={strings.today.howItWorksDone}
          variant="secondary"
          onPress={onClose}
          style={styles.done}
        />
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.tight,
      paddingBottom: spacing.stack,
      gap: spacing.control,
    },
    title: {
      fontSize: typeScale.sheetTitle,
      lineHeight: 32,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      includeFontPadding: false,
      marginBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.stack,
    },
    // A fixed box so the four lines share one left edge whatever each
    // glyph's own bounds are.
    glyph: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    line: {
      flex: 1,
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 22,
      // Optically aligns the first line's x-height with the 28pt glyph.
      paddingTop: 3,
    },
    done: {
      marginTop: spacing.xs,
    },
  });
}
