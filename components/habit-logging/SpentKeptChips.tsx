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
 * No motion (house style, like SegmentedControl): the thumb swaps instantly.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, shadows, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
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
};

export function SpentKeptChips({
  spentCents,
  keptCents,
  value,
  onChange,
  checkInPending = false,
}: SpentKeptChipsProps): React.JSX.Element {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const spentSelected = value === 'spent';
  const keptSelected = value === 'kept';
  const formattedSpent = format(spentCents);
  const formattedKept = format(keptCents);

  // The pending dot's meaning is carried into the a11y label, not a separate
  // element: VoiceOver never sees the dot, just the extra clause.
  const pendingSuffix = checkInPending ? `, ${strings.today.checkInPendingA11y}` : '';

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
        accessibilityLabel={selectableLabel(`${strings.today.spentChipLabel} ${formattedSpent}`, spentSelected)}
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
      </Pressable>

      <Pressable
        onPress={() => onChange('kept')}
        accessibilityRole="tab"
        accessibilityState={{ selected: keptSelected }}
        accessibilityLabel={
          selectableLabel(`${strings.today.keptChipLabel} ${formattedKept}`, keptSelected) + pendingSuffix
        }
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
        <Text
          style={[styles.amount, keptSelected ? styles.keptAmountSelected : null]}
          maxFontSizeMultiplier={1.3}
          // UX-067: same fix as the Spent amount above.
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formattedKept}
        </Text>
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
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    amount: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.slate,
      marginTop: 6,
    },
    spentAmountSelected: {
      color: theme.ink,
    },
    keptAmountSelected: {
      color: theme.primaryDark,
    },
  });
}
