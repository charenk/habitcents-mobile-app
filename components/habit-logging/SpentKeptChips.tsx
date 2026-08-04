/**
 * SpentKeptChips (redesign U5, ADR 0019, DI-5): the two value chips ARE the
 * Today tab control. Two side-by-side cards, Spent and Kept, each showing an
 * eyebrow label over a serif amount; tapping one swaps the body content below
 * between the two in-page views (Spent is today's spend only, Kept holds the
 * kept-today number plus the habit content).
 *
 * Selection is carried by the ring (borderWidth/borderColor), never by color:
 * a selected card gets the sage border, an unselected one the cloud hairline.
 * The Spent amount is theme.ink always, selected or not, because spend is
 * never a win and must never borrow the sage "kept" color.
 *
 * No motion (house style, like SegmentedControl): the ring swaps instantly.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { selectableLabel } from '@/utils/a11y';

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
      style={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel={strings.today.spentKeptTabsLabel}
    >
      <Pressable
        onPress={() => onChange('spent')}
        accessibilityRole="tab"
        accessibilityState={{ selected: spentSelected }}
        accessibilityLabel={selectableLabel(`${strings.today.spentChipLabel} ${formattedSpent}`, spentSelected)}
        style={[styles.card, spentSelected ? styles.cardSelected : styles.cardUnselected]}
        // DI-7: a stable non-a11y hook for tests, since both Today panes now
        // stay mounted and can carry their own "Kept"/"Spent"-prefixed a11y
        // labels (e.g. KeptHero's "Kept so far, ..."), which broke the old
        // getByLabelText(/^Kept /) pattern used to find this chip.
        testID="spent-chip"
      >
        <Text style={styles.eyebrow} maxFontSizeMultiplier={1.5}>
          {strings.today.spentChipLabel.toUpperCase()}
        </Text>
        {/* Spend is never a win: ink always, selected or not (never sage). */}
        <Text style={styles.spentAmount} maxFontSizeMultiplier={1.3}>
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
        style={[styles.card, keptSelected ? styles.cardSelected : styles.cardUnselected]}
        testID="kept-chip"
      >
        <View style={styles.keptEyebrowRow}>
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.5}>
            {strings.today.keptChipLabel.toUpperCase()}
          </Text>
          {checkInPending ? <View style={styles.pendingDot} /> : null}
        </View>
        <Text style={styles.keptAmount} maxFontSizeMultiplier={1.3}>
          {formattedKept}
        </Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
    },
    card: {
      flex: 1,
      borderRadius: radii.feature,
      backgroundColor: theme.white,
      padding: 14,
    },
    // The ring signals selection ("this is the view you're looking at"), not
    // positivity: it is the same sage used for every other selected control in
    // the app, never a hint that the number itself is good.
    cardSelected: {
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    cardUnselected: {
      borderWidth: 1,
      borderColor: theme.cloud,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.mist,
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
    spentAmount: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.ink,
      marginTop: 6,
    },
    keptAmount: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.primaryDark,
      marginTop: 6,
    },
  });
}
