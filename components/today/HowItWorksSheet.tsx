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
 * ONE SPINE, TWO PHASES (Charen, 2026-09-10, redesigned on the canvas). The
 * four flat rows are gone. A single connector runs the length of the sheet
 * and changes colour at "Then you break it", because that is the moment the
 * app itself hands a leak over to become a habit: LEAKS FOUND above, BREAKING
 * NOW below. The old row 3 read "Break a leak, and every skip keeps...",
 * using the pre-commitment word for a post-commitment act, which is why a
 * skip never appeared to belong to anything. The relationship is now drawn
 * rather than described, and the missing step (you pick one) is a row of its
 * own.
 *
 * Each row leads with one locked word in bold and defines it in the same
 * sentence, so leak, habit, skip, slip and kept are explained once, in place,
 * with no glossary. Slip rides inside the skip row: it is the same day seen
 * the other way, and giving it its own node implied it moves something.
 *
 * The long arc closes the sheet in its own tinted block, with the money
 * ahead of the number. See the comment above strings.today.howItWorksArcBody
 * for why that order is the whole point.
 *
 * Modelled on ConfirmSheet's skeleton (serif title, one bottom button)
 * without its confirm guard: nothing here mutates, so a double tap is just a
 * double close. Decision-sheet convention keeps the bottom button; ADR 0031's
 * "no in-sheet Cancel" is about form sheets, and "Got it" is an
 * acknowledgement, not a cancel.
 *
 * It SCROLLS, capped at 86 percent of the window, the same way PickOneSheet's
 * gated body does. Sheet has no scroll of its own, and this sheet's copy is
 * uncapped under Dynamic Type on purpose (it is content, like EmptyState's
 * body). Verified 2026-09-10 at accessibility-extra-extra-extra-large: five
 * rows plus the arc block run well past a 932pt screen, taking the title and
 * "Got it" off it entirely. The cap is what keeps both reachable.
 *
 * No motion of its own; Sheet's enter and exit, and its reduced-motion path,
 * are inherited.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';

export type HowItWorksSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type Row = { term: string; rest: string };

/** The spine's own geometry. The dot is centred in the rail, and the segment
 *  above and below it draws the line, so the connector is continuous through
 *  every row including the phase headings. */
const RAIL_WIDTH = 12;
const DOT = 10;
const LINE = 1.5;

/**
 * One row: a rail segment carrying the connector and its dot, and the
 * sentence beside it. `last` drops the trailing line so the spine ends on
 * the final dot rather than running into the arc block.
 *
 * The whole row is one VoiceOver stop carrying the joined sentence; the dot
 * and line are decorative, and the emphasis on the term is visual only.
 */
function SpineRow({
  row,
  tone,
  last,
  styles,
}: {
  row: Row;
  tone: 'find' | 'break';
  last?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const spoken = row.term ? `${row.term} ${row.rest}` : row.rest;
  return (
    <View style={styles.row} accessible accessibilityLabel={spoken}>
      <View style={styles.rail}>
        <View style={[styles.dot, tone === 'break' ? styles.dotBreak : styles.dotFind]} />
        {last ? null : (
          <View style={[styles.line, tone === 'break' ? styles.lineBreak : styles.lineFind]} />
        )}
      </View>
      <Text style={[styles.line1, last ? styles.lineLast : null]}>
        {/* Empty term is the translation escape hatch: the row then renders
            as one unemphasized sentence. See strings.today.howItWorksFindRows. */}
        {row.term ? (
          <Text style={[styles.term, tone === 'break' ? styles.termBreak : styles.termFind]}>
            {row.term}{' '}
          </Text>
        ) : null}
        {row.rest}
      </Text>
    </View>
  );
}

/** A phase heading. Carries no dot, so the connector runs straight past it:
 *  the phases mark a change of colour on one line, not two lists. */
function PhaseRow({
  label,
  tone,
  styles,
}: {
  label: string;
  tone: 'find' | 'break';
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel={label}>
      <View style={styles.rail}>
        <View style={[styles.line, tone === 'break' ? styles.lineBreak : styles.lineFind]} />
      </View>
      <Text
        style={[styles.phase, tone === 'break' ? styles.phaseBreak : styles.phaseFind]}
        maxFontSizeMultiplier={1.5}
      >
        {label}
      </Text>
    </View>
  );
}

export function HowItWorksSheet({ visible, onClose }: HowItWorksSheetProps) {
  const theme = useTheme();
  const strings = useStrings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const breakRows = strings.today.howItWorksBreakRows;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={strings.today.howItWorksTitle}
      // Title pinned, rows scroll, Got it pinned: at XXXL Dynamic Type the
      // rows used to push past the screen with no scroll at all (the open
      // item this closes); now the panel clamp + body scroll carry it.
      header={
        <View style={styles.titleWrap}>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
            {strings.today.howItWorksTitle}
          </Text>
        </View>
      }
      contentContainerStyle={styles.content}
      footer={<Button label={strings.today.howItWorksDone} variant="secondary" onPress={onClose} />}
    >
      {/* Sheet has no testID prop of its own; the wrapper carries it. */}
      <View testID="how-it-works-sheet">
        <PhaseRow label={strings.today.howItWorksFindTitle} tone="find" styles={styles} />
        {strings.today.howItWorksFindRows.map((row) => (
          <SpineRow key={row.rest} row={row} tone="find" styles={styles} />
        ))}

        <PhaseRow label={strings.today.howItWorksBreakTitle} tone="break" styles={styles} />
        {breakRows.map((row, i) => (
          <SpineRow
            key={row.rest}
            row={row}
            tone="break"
            last={i === breakRows.length - 1}
            styles={styles}
          />
        ))}

        <View
          style={styles.arc}
          accessible
          accessibilityLabel={`${strings.today.howItWorksArcTerm} ${strings.today.howItWorksArcBody}`}
        >
          {/* Its own style, not the row's: line1 carries `flex: 1` so it can
              share a flex row with the rail, and inheriting that here
              collapsed the block to a single clipped line. */}
          <Text style={styles.arcText}>
            <Text style={styles.arcTerm}>{strings.today.howItWorksArcTerm} </Text>
            {strings.today.howItWorksArcBody}
          </Text>
        </View>
      </View>
    </Sheet>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.sm,
      paddingBottom: spacing.stack,
    },
    titleWrap: {
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.tight,
      paddingBottom: spacing.xs,
    },
    title: {
      fontSize: typeScale.sheetTitle,
      lineHeight: 32,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      includeFontPadding: false,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    rail: {
      width: RAIL_WIDTH,
      alignItems: 'center',
    },
    dot: {
      width: DOT,
      height: DOT,
      borderRadius: radii.pill,
      // Centres the dot on the first line's x-height, the same optical
      // alignment the old 28pt glyph box did with paddingTop 3.
      marginTop: 6,
    },
    // Outline while we are still describing what the app found; solid from
    // the moment the user takes one on. Same signal the tab bar uses.
    dotFind: {
      borderWidth: LINE,
      borderColor: theme.mistText,
    },
    dotBreak: {
      backgroundColor: theme.primary,
    },
    line: {
      width: LINE,
      flex: 1,
    },
    lineFind: {
      backgroundColor: theme.cloud,
    },
    lineBreak: {
      backgroundColor: theme.primaryMuted,
    },
    line1: {
      flex: 1,
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      lineHeight: 22,
      paddingBottom: spacing.md,
    },
    lineLast: {
      paddingBottom: 0,
    },
    term: {
      fontFamily: theme.fonts.uiSemibold,
    },
    termFind: {
      color: theme.ink,
    },
    termBreak: {
      color: theme.primary,
    },
    phase: {
      flex: 1,
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      paddingBottom: spacing.stack,
    },
    phaseFind: {
      color: theme.mistText,
    },
    phaseBreak: {
      color: theme.primary,
      paddingTop: spacing.tight,
    },
    arc: {
      backgroundColor: theme.primaryLight,
      borderRadius: radii.control,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.stack,
      marginTop: spacing.xl,
    },
    arcText: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    arcTerm: {
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
  });
}
