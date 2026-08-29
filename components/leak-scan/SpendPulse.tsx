import React, { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { buildSpendPulse } from '@/utils/leakScan/spendPulse';
import type { PulseCell, PulseGranularity } from '@/utils/leakScan/spendPulse';
import type { ScanResult } from '@/utils/leakScan/types';
import { track } from '@/utils/analytics';
import { pulseCellLabel } from '@/utils/a11y';

type SpendPulseProps = {
  result: ScanResult;
  /** Cell tap opens a detail sheet (date, total, merchant list) per spec 5.3. */
  onCellPress?: (cell: PulseCell) => void;
};

type Styles = ReturnType<typeof createStyles>;

// UX-037: standalone chips were a third switcher; the pattern vocabulary has
// exactly one (the cloud-track SegmentedControl). Options built once, not
// re-templated per render, mirroring the HATCH_LINE_TOPS treatment below.
const GRANULARITY_OPTIONS: { value: PulseGranularity; label: string }[] = [
  { value: 'day', label: strings.leakScan.pulseGranularityDay },
  { value: 'month', label: strings.leakScan.pulseGranularityMonth },
  { value: 'year', label: strings.leakScan.pulseGranularityYear },
];

// UX-033: the hatch pattern's 4 lines sit at fixed offsets that never change
// across renders (only the index they come from is fixed), so this is
// computed once, ever, rather than re-templated inside every HatchPattern
// render.
const HATCH_LINE_TOPS: `${number}%`[] = [0, 1, 2, 3].map((i) => `${i * 30 - 15}%` as const);

/**
 * The load-bearing coverage-honesty component (results 5.3, visual spec 5).
 * Three visually distinct cell fills: a red heat ramp for spend (the one
 * sanctioned non-alarm danger-hue use), a flat neutral for a covered
 * zero-spend day, and a diagonal hatch for out-of-coverage (never a flat
 * fill, never confused with zero). Shares grid grammar with the habit streak
 * calendar but not its semantics or fills.
 */
function SpendPulseImpl({ result, onCellPress }: SpendPulseProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const autoData = useMemo(() => buildSpendPulse(result), [result]);
  const [granularity, setGranularity] = useState<PulseGranularity>(autoData.granularity);
  const data = useMemo(
    () => (granularity === autoData.granularity ? autoData : buildSpendPulse(result, granularity)),
    [result, granularity, autoData]
  );

  // UX-070: the year column count was 53, a GitHub-contribution-grid width,
  // but the data layer does not emit a grid of days at year granularity: it
  // aggregates by `yyyy` (utils/leakScan/spendPulse.ts aggregateCells +
  // yearKey), so it emits ONE cell per calendar year, and year view only
  // engages past ~14 months of coverage. Two to four cells laid out in 53
  // columns rendered as ~6pt slivers with most of the row empty. Sizing the
  // grid to the cells it actually has makes the year view legible again.
  //
  // UX-015 was filed against the same constant but assumed 365+ daily cells,
  // and therefore a field of overlapping sub-target buttons. That premise was
  // wrong; the real defect is this layout mismatch. Year cells stay
  // non-interactive regardless: a whole calendar year has no single day to
  // open, so a tap has nothing to show.
  const columns =
    data.granularity === 'year' ? Math.min(Math.max(data.cells.length, 1), 10) : 10;
  const cellsAreInteractive = data.granularity !== 'year';

  const handleCellPress = (cell: PulseCell) => {
    track('scan_pulse_day_opened', {});
    onCellPress?.(cell);
  };

  return (
    <View style={styles.container}>
      {/* UX-037: was a standalone third switcher (chips with
          accessibilityRole="button"); swapped for the house SegmentedControl,
          which also brings the correct tablist/tab roles for free. */}
      <View style={styles.toggleRow}>
        <SegmentedControl
          options={GRANULARITY_OPTIONS}
          value={granularity}
          onChange={setGranularity}
          accessibilityLabel={strings.leakScan.pulseGranularityLabel}
        />
      </View>

      <View style={styles.grid}>
        {data.cells.map((cell) =>
          cellsAreInteractive ? (
            <TouchableOpacity
              key={cell.key}
              style={[styles.cellWrap, { width: `${100 / columns}%` }]}
              onPress={() => handleCellPress(cell)}
              accessibilityRole="button"
              accessibilityLabel={cellA11yLabel(cell, format)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <PulseCellView cell={cell} theme={theme} styles={styles} />
            </TouchableOpacity>
          ) : (
            // UX-015: year granularity is non-interactive; a plain View
            // (not a Pressable/TouchableOpacity, and hidden from the
            // accessibility tree) so it never reads as a button.
            <View
              key={cell.key}
              style={[styles.cellWrap, { width: `${100 / columns}%` }]}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            >
              <PulseCellView cell={cell} theme={theme} styles={styles} />
            </View>
          )
        )}
      </View>

      <View style={styles.legend}>
        <LegendSwatch color={theme.pulseRamp[theme.pulseRamp.length - 1]} label={strings.leakScan.pulseLegendSpend} theme={theme} styles={styles} />
        <LegendSwatch color={theme.pulseZeroSpend} label={strings.leakScan.pulseLegendZero} theme={theme} styles={styles} />
        <LegendSwatch hatch label={strings.leakScan.pulseLegendOutOfCoverage} theme={theme} styles={styles} />
      </View>

      <Text style={styles.caption}>
        {strings.leakScan.pulseCaption(data.daysTransacted, data.spanDays)}
      </Text>
    </View>
  );
}

/**
 * Memoized: props are `result` (only changes when a scan re-runs) and
 * `onCellPress` (already the stable `setOpenPulseCell` setter at the only
 * call site, ResultsScreen.tsx), so this bails cleanly on unrelated
 * ResultsScreen re-renders instead of re-laying-out the whole grid.
 */
export const SpendPulse = memo(SpendPulseImpl);

function cellA11yLabel(cell: PulseCell, format: (cents: number) => string): string {
  if (cell.state === 'out-of-coverage') return pulseCellLabel(cell.key, 'outside');
  if (cell.state === 'zero-spend') return pulseCellLabel(cell.key, 'zero');
  return pulseCellLabel(cell.key, 'spend', format(cell.totalCents));
}

function PulseCellView({ cell, theme, styles }: { cell: PulseCell; theme: AppTheme; styles: Styles }) {
  if (cell.state === 'out-of-coverage') {
    return (
      <View style={styles.cellHatchWrap}>
        <HatchPattern lineColor={theme.pulseHatchLine} styles={styles} />
      </View>
    );
  }
  // UX-033: this is the one fill that must stay genuinely data-driven (the
  // heat level / zero-spend token varies per cell), so it stays a small
  // inline object merged onto the hoisted static geometry below rather than
  // living in createStyles.
  const bg = cell.state === 'spend' ? theme.pulseRamp[cell.level] : theme.pulseZeroSpend;
  return <View style={[styles.cellFill, { backgroundColor: bg }]} />;
}

/** Diagonal-line hatch approximated with a few rotated thin bars (no SVG dep). */
function HatchPattern({ lineColor, styles }: { lineColor: string; styles: Styles }) {
  return (
    <View style={styles.hatchWrap}>
      {HATCH_LINE_TOPS.map((top, i) => (
        <View key={i} style={[styles.hatchLine, { top, backgroundColor: lineColor }]} />
      ))}
    </View>
  );
}

function LegendSwatch({
  color,
  hatch,
  label,
  theme,
  styles,
}: {
  color?: string;
  hatch?: boolean;
  label: string;
  theme: AppTheme;
  styles: Styles;
}) {
  return (
    <View style={styles.legendItem}>
      {hatch ? (
        <View style={styles.legendHatchBox}>
          <HatchPattern lineColor={theme.pulseHatchLine} styles={styles} />
        </View>
      ) : (
        <View style={[styles.legendColorBox, { backgroundColor: color }]} />
      )}
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.white,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 14,
    },
    // UX-037: SegmentedControl stretches and lays itself out; this wrapper
    // only carries the gap below it now.
    toggleRow: {
      marginBottom: 12,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cellWrap: {
      padding: 2,
    },
    // UX-033: hoisted static geometry for the per-cell fill and hatch views,
    // previously recreated as inline object literals on every render (8 of
    // them, plus 4 more per HatchPattern instance for its line bars).
    cellHatchWrap: {
      aspectRatio: 1,
      borderRadius: 4,
      borderWidth: 0.5,
      borderColor: theme.pulseHatchBorder,
      overflow: 'hidden',
    },
    cellFill: {
      aspectRatio: 1,
      borderRadius: 4,
    },
    hatchWrap: {
      flex: 1,
      backgroundColor: 'transparent',
      overflow: 'hidden',
    },
    hatchLine: {
      position: 'absolute',
      width: '160%',
      height: 1,
      left: '-30%',
      transform: [{ rotate: '45deg' }],
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    legendHatchBox: {
      width: 13,
      height: 13,
      borderRadius: radii.micro,
      borderWidth: 0.5,
      borderColor: theme.pulseHatchBorder,
      overflow: 'hidden',
    },
    legendColorBox: {
      width: 13,
      height: 13,
      borderRadius: radii.micro,
    },
    legendLabel: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
    },
    caption: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 10,
    },
  });
}
