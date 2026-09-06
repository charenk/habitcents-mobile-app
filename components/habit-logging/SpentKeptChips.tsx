/**
 * SpentKeptChips (2026-08-04 artifact "Today, in the app's own vocabulary",
 * refining ADR 0019 / redesign U5, DI-5): the segmented scoreboard that is
 * the Today tab control. It is SegmentedControl's own track/thumb treatment
 * scaled up to card size, so Today speaks the same segmented-control
 * vocabulary Money already does, rather than a bespoke ring-selected pair of
 * cards. Tapping a segment swaps the body content below between the two
 * in-page views (Spent is today's spend only, Kept holds the kept-today
 * number plus the habit content).
 *
 * Selection is carried by fill, not a ring: the selected segment gets the
 * white thumb (plus card shadow) that SegmentedControl uses for its own
 * selected segment; the unselected segment sits transparent on the cloud
 * track. The Spent amount is never sage, selected or not, because spend is
 * never a win and must never borrow the "kept" color; the ring this rule
 * used to guard is gone, so the rule is now trivially honored by the fill
 * simply never being sage on that side.
 *
 * Geometry (Charen's call, 2026-08-16): this is SegmentedControl's own
 * nesting rule, track radius = thumb radius + track padding, scaled to this
 * control's value size. Thumb (segment) sits at radii.feature (20), track
 * padding is TRACK_PADDING (3), so the track sits at 23. The old track
 * (radii.feature, 20) and segment (radii.feature - 3, 17) pairing predated
 * the rule and used a derived magic number for the segment; this replaces
 * both with the named tokens the rule expects.
 *
 * Not-started is not zero (Charen, 2026-09-03): until the underlying
 * activity exists (any expense logged for Spent, any habit break started
 * for Kept), the amount slot renders quiet placeholder words instead of a
 * currency amount, because $0.00 would read as a measured verdict on a game
 * that has not begun. The spentStarted/keptStarted props carry the gates;
 * once true, amounts show for good, including an honest $0.00. The
 * placeholder is Inter, never the display serif (serif is locked to titles
 * and money, and a word is neither), and slate in both selection states
 * (mistText is only 4.06:1 on the cloud track, UX-003).
 *
 * No motion (house style, like SegmentedControl): the thumb swaps instantly.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, shadows, typeScale, type AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import { selectableLabel } from '@/utils/a11y';

// Track padding (also the inter-segment gap): the nesting rule this file and
// SegmentedControl.tsx both follow is track radius = thumb radius + this
// value. Kept local rather than shared: SegmentedControl's own TRACK_PADDING
// is a private module constant with no established cross-file export point,
// and the two scales have no other coupling that would justify importing
// one component's internals into the other's.
const TRACK_PADDING = 3;

export type SpentKeptView = 'spent' | 'kept';

export type SpentKeptChipsProps = {
  spentCents: number;
  keptCents: number;
  value: SpentKeptView;
  onChange: (v: SpentKeptView) => void;
  /** True while today's check-in question is unanswered; renders a quiet dot on the Kept chip. */
  checkInPending?: boolean;
  /** True once any expense has ever been logged; false renders "No logs yet"
   *  in the Spent amount slot (file header, not-started is not zero). */
  spentStarted?: boolean;
  /** True once any habit break has ever been started; false renders
   *  "No skips yet" in the Kept amount slot. */
  keptStarted?: boolean;
};

export function SpentKeptChips({
  spentCents,
  keptCents,
  value,
  onChange,
  checkInPending = false,
  spentStarted = true,
  keptStarted = true,
}: SpentKeptChipsProps): React.JSX.Element {
  const theme = useTheme();
  const strings = useStrings();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const spentSelected = value === 'spent';
  const keptSelected = value === 'kept';
  const formattedSpent = format(spentCents);
  const formattedKept = format(keptCents);

  // The pending dot's meaning is carried into the a11y label, not a separate
  // element: VoiceOver never sees the dot, just the extra clause.
  const pendingSuffix = checkInPending ? `, ${strings.today.checkInPendingA11y}` : '';

  // Not-started labels read as a clause ("Spent today, no logs yet"), not a
  // value, so VoiceOver never announces a number that was not measured.
  const spentValueLabel = spentStarted
    ? `${strings.today.spentChipLabel} ${formattedSpent}`
    : `${strings.today.spentChipLabel}, ${strings.today.spentChipNoLogs.toLowerCase()}`;
  const keptValueLabel = keptStarted
    ? `${strings.today.keptChipLabel} ${formattedKept}`
    : `${strings.today.keptChipLabel}, ${strings.today.keptChipNoSkips.toLowerCase()}`;

  return (
    <View
      style={styles.track}
      accessibilityRole="tablist"
      accessibilityLabel={strings.today.spentKeptTabsLabel}
    >
      <Pressable
        onPress={() => onChange('spent')}
        accessibilityRole="tab"
        accessibilityState={{ selected: spentSelected }}
        accessibilityLabel={selectableLabel(spentValueLabel, spentSelected)}
        style={[styles.segment, spentSelected ? styles.segmentSelected : null]}
        // DI-7: a stable non-a11y hook for tests, since both Today panes now
        // stay mounted and can carry their own "Kept"/"Spent"-prefixed a11y
        // labels (e.g. KeptHero's "Kept so far, ..."), which broke the old
        // getByLabelText(/^Kept /) pattern used to find this chip.
        testID="spent-chip"
      >
        <Text
          style={[styles.eyebrow, spentSelected ? styles.eyebrowSpentSelected : null]}
          maxFontSizeMultiplier={1.5}
        >
          {strings.today.spentChipLabel}
        </Text>
        {/* Spend is never a win: it never takes the sage fill, selected or
            not, only slate at rest and ink when selected. */}
        {spentStarted ? (
          <Text
            style={[styles.amount, spentSelected ? styles.spentAmountSelected : null]}
            maxFontSizeMultiplier={1.3}
            // UX-067: without a line cap a long formatted amount could wrap and
            // misalign the Spent/Kept pair; adjustsFontSizeToFit shrinks the
            // glyphs to fit the one line instead.
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formattedSpent}
          </Text>
        ) : (
          <Text style={styles.placeholder} maxFontSizeMultiplier={1.5} numberOfLines={1}>
            {strings.today.spentChipNoLogs}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => onChange('kept')}
        accessibilityRole="tab"
        accessibilityState={{ selected: keptSelected }}
        accessibilityLabel={selectableLabel(keptValueLabel, keptSelected) + pendingSuffix}
        style={[styles.segment, keptSelected ? styles.segmentSelected : null]}
        testID="kept-chip"
      >
        <View style={styles.keptEyebrowRow}>
          <Text
            style={[styles.eyebrow, keptSelected ? styles.eyebrowKeptSelected : null]}
            maxFontSizeMultiplier={1.5}
          >
            {strings.today.keptChipLabel}
          </Text>
          {checkInPending ? <View style={styles.pendingDot} /> : null}
        </View>
        {keptStarted ? (
          <Text
            style={[styles.amount, keptSelected ? styles.keptAmountSelected : null]}
            maxFontSizeMultiplier={1.3}
            // UX-067: same fix as the Spent amount above.
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formattedKept}
          </Text>
        ) : (
          <Text style={styles.placeholder} maxFontSizeMultiplier={1.5} numberOfLines={1}>
            {strings.today.keptChipNoSkips}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: theme.cloud,
      borderRadius: radii.feature + TRACK_PADDING,
      padding: TRACK_PADDING,
      gap: TRACK_PADDING,
    },
    segment: {
      flex: 1,
      borderRadius: radii.feature,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    segmentSelected: {
      backgroundColor: theme.white,
      ...shadows.card,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      // UX-060: uppercased by the style, not by a JS .toUpperCase() on the
      // string, so the string stays sentence case for screen readers.
      textTransform: 'uppercase',
      // Slate, not mistText: the UNSELECTED segment is transparent over the
      // cloud track, where mistText is only 4.06:1. mistText is certified on
      // white and snow, not on cloud. Slate is 6.39:1 there. UX-003.
      color: theme.slate,
    },
    eyebrowSpentSelected: {
      color: theme.ink,
    },
    eyebrowKeptSelected: {
      color: theme.primaryDark,
    },
    keptEyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pendingDot: {
      width: 6,
      height: 6,
      borderRadius: radii.micro,
      backgroundColor: theme.primary,
    },
    amount: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.slate,
      marginTop: 6,
    },
    // Not-started slot (file header): Inter at secondary size, slate in both
    // selection states. lineHeight pins the slot to the 22pt serif amount's
    // measured line box (29, verified on web against a rendered amount) so
    // the chip is pixel-identical in every start-state mix, including one
    // side showing an amount and the other this placeholder.
    placeholder: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 6,
      lineHeight: 29,
    },
    spentAmountSelected: {
      color: theme.ink,
    },
    keptAmountSelected: {
      color: theme.primaryDark,
    },
  });
}
