import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { AppTheme } from '@/constants/theme';
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

const GRANULARITIES: PulseGranularity[] = ['day', 'month', 'year'];

/**
 * The load-bearing coverage-honesty component (results 5.3, visual spec 5).
 * Three visually distinct cell fills: a red heat ramp for spend (the one
 * sanctioned non-alarm danger-hue use), a flat neutral for a covered
 * zero-spend day, and a diagonal hatch for out-of-coverage (never a flat
 * fill, never confused with zero). Shares grid grammar with the habit streak
 * calendar but not its semantics or fills.
 */
export function SpendPulse({ result, onCellPress }: SpendPulseProps) {
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
            <PulseCellView cell={cell} theme={theme} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.legend}>
        <LegendSwatch color={theme.pulseRamp[theme.pulseRamp.length - 1]} label={strings.leakScan.pulseLegendSpend} theme={theme} />
        <LegendSwatch color={theme.pulseZeroSpend} label={strings.leakScan.pulseLegendZero} theme={theme} />
        <LegendSwatch hatch label={strings.leakScan.pulseLegendOutOfCoverage} theme={theme} />
      </View>

      <Text style={styles.caption}>
        {strings.leakScan.pulseCaption(data.daysTransacted, data.coveredDays)}
      </Text>
    </View>
  );
}

function cellA11yLabel(cell: PulseCell, format: (cents: number) => string): string {
  if (cell.state === 'out-of-coverage') return pulseCellLabel(cell.key, 'outside');
  if (cell.state === 'zero-spend') return pulseCellLabel(cell.key, 'zero');
  return pulseCellLabel(cell.key, 'spend', format(cell.totalCents));
}

function PulseCellView({ cell, theme }: { cell: PulseCell; theme: AppTheme }) {
  if (cell.state === 'out-of-coverage') {
    return (
      <View
        style={{
          aspectRatio: 1,
          borderRadius: 4,
          borderWidth: 0.5,
          borderColor: theme.pulseHatchBorder,
          overflow: 'hidden',
        }}
      >
        <HatchPattern lineColor={theme.pulseHatchLine} />
      </View>
    );
  }
  const bg = cell.state === 'spend' ? theme.pulseRamp[cell.level] : theme.pulseZeroSpend;
  return <View style={{ aspectRatio: 1, borderRadius: 4, backgroundColor: bg }} />;
}

/** Diagonal-line hatch approximated with a few rotated thin bars (no SVG dep). */
function HatchPattern({ lineColor }: { lineColor: string }) {
  const lines = [0, 1, 2, 3];
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent', overflow: 'hidden' }}>
      {lines.map((i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: '160%',
            height: 1,
            backgroundColor: lineColor,
            top: `${i * 30 - 15}%`,
            left: '-30%',
            transform: [{ rotate: '45deg' }],
          }}
        />
      ))}
    </View>
  );
}

function LegendSwatch({
  color,
  hatch,
  label,
  theme,
}: {
  color?: string;
  hatch?: boolean;
  label: string;
  theme: AppTheme;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {hatch ? (
        <View
          style={{
            width: 13,
            height: 13,
            borderRadius: 3,
            borderWidth: 0.5,
            borderColor: theme.pulseHatchBorder,
            overflow: 'hidden',
          }}
        >
          <HatchPattern lineColor={theme.pulseHatchLine} />
        </View>
      ) : (
        <View style={{ width: 13, height: 13, borderRadius: 3, backgroundColor: color }} />
      )}
      <Text style={{ fontSize: 11, color: theme.textSecondary }}>{label}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: theme.border,
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
      borderRadius: 999,
      backgroundColor: theme.chipInactiveBg,
      borderWidth: 1,
      borderColor: theme.chipBorder,
    },
    toggleChipActive: {
      backgroundColor: theme.chipActiveBg,
      borderColor: theme.chipActiveBg,
    },
    toggleChipText: {
      fontSize: 12,
      fontWeight: '600',
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
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
    },
    caption: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 10,
    },
  });
}
