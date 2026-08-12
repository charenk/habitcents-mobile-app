import React, { memo, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
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

const GRANULARITIES: PulseGranularity[] = ['day', 'month', 'year'];

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

  const columns = data.granularity === 'year' ? 53 : 10;

  const handleCellPress = (cell: PulseCell) => {
    track('scan_pulse_day_opened', {});
    onCellPress?.(cell);
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        {GRANULARITIES.map((g) => {
          const active = g === granularity;
          const label =
            g === 'day'
              ? strings.leakScan.pulseGranularityDay
              : g === 'month'
              ? strings.leakScan.pulseGranularityMonth
              : strings.leakScan.pulseGranularityYear;
          return (
            <TouchableOpacity
              key={g}
              onPress={() => setGranularity(g)}
              style={[styles.toggleChip, active && styles.toggleChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <Text style={[styles.toggleChipText, active && styles.toggleChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.grid}>
        {data.cells.map((cell) => (
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
        ))}
      </View>

      <View style={styles.legend}>
        <LegendSwatch color={theme.pulseRamp[theme.pulseRamp.length - 1]} label={strings.leakScan.pulseLegendSpend} theme={theme} styles={styles} />
        <LegendSwatch color={theme.pulseZeroSpend} label={strings.leakScan.pulseLegendZero} theme={theme} styles={styles} />
        <LegendSwatch hatch label={strings.leakScan.pulseLegendOutOfCoverage} theme={theme} styles={styles} />
      </View>

      <Text style={styles.caption}>
        {strings.leakScan.pulseCaption(data.daysTransacted, data.coveredDays)}
      </Text>
    </View>
  );
}

/**
 * Memoized: props are `result` (only changes when a scan re-runs) and
 * `onCellPress` (already the stable `setOpenPulseCell` setter at the only
 * call site, ResultsScreen.tsx), so this bails cleanly on unrelated
 * ResultsScreen re-renders instead of re-laying-out a 365-cell year grid.
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
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    toggleChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: theme.chipInactiveBg,
      borderWidth: 1,
      borderColor: theme.chipBorder,
    },
    toggleChipActive: {
      backgroundColor: theme.chipActiveBg,
      borderColor: theme.chipActiveBg,
    },
    toggleChipText: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.chipInactiveText,
    },
    toggleChipTextActive: {
      color: theme.chipActiveText,
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
      gap: 5,
    },
    legendHatchBox: {
      width: 13,
      height: 13,
      borderRadius: 3,
      borderWidth: 0.5,
      borderColor: theme.pulseHatchBorder,
      overflow: 'hidden',
    },
    legendColorBox: {
      width: 13,
      height: 13,
      borderRadius: 3,
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
