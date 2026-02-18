import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

type PieSlice = {
  value: number;
  color: string;
  label: string;
};

type PieChartProps = {
  data: PieSlice[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string;
};

export function PieChart({
  data,
  size = 160,
  strokeWidth = 24,
  showLegend = true,
  centerLabel,
  centerValue,
}: PieChartProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, size, strokeWidth), [theme, size, strokeWidth]);

  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  // Calculate slice angles
  const slices = useMemo(() => {
    let currentAngle = -90; // Start from top
    return data.map((slice) => {
      const angle = (slice.value / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        ...slice,
        startAngle,
        angle,
        percentage: Math.round((slice.value / total) * 100),
      };
    });
  }, [data, total]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <View style={[styles.chart, { width: size, height: size }]}>
          {/* Background ring */}
          <View style={[styles.ring, styles.ringBackground]} />

          {/* Pie slices using SVG-like technique with Views */}
          {slices.map((slice, index) => {
            if (slice.angle === 0) return null;

            // Calculate stroke dashoffset for this slice
            const sliceLength = (slice.angle / 360) * circumference;
            const previousSlices = slices.slice(0, index);
            const offset = previousSlices.reduce(
              (sum, s) => sum + (s.angle / 360) * circumference,
              0
            );

            return (
              <View
                key={index}
                style={[
                  styles.sliceContainer,
                  {
                    transform: [{ rotate: `${slice.startAngle}deg` }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.slice,
                    {
                      backgroundColor: slice.color,
                      transform: [{ rotate: `${Math.min(slice.angle, 180)}deg` }],
                    },
                  ]}
                />
                {slice.angle > 180 && (
                  <View
                    style={[
                      styles.slice,
                      styles.sliceSecondHalf,
                      {
                        backgroundColor: slice.color,
                        transform: [{ rotate: `${180}deg` }],
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}

          {/* Center circle */}
          <View style={styles.centerCircle}>
            {centerValue && (
              <>
                <Text style={styles.centerValue}>{centerValue}</Text>
                {centerLabel && (
                  <Text style={styles.centerLabel}>{centerLabel}</Text>
                )}
              </>
            )}
          </View>
        </View>
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {slices.filter(s => s.percentage > 0).map((slice, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {slice.label}
                </Text>
                <Text style={styles.legendValue}>{slice.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Simplified donut chart that works better in React Native
export function DonutChart({
  data,
  size = 160,
  strokeWidth = 24,
  showLegend = true,
  centerLabel,
  centerValue,
}: PieChartProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, size, strokeWidth), [theme, size, strokeWidth]);

  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const slices = useMemo(() => {
    return data.map((slice) => ({
      ...slice,
      percentage: Math.round((slice.value / total) * 100),
    }));
  }, [data, total]);

  // Create visual segments as stacked bars
  const innerRadius = size / 2 - strokeWidth;

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <View style={[styles.donutContainer, { width: size, height: size }]}>
          {/* Segments displayed as a horizontal bar chart wrapped in a circle visual */}
          <View style={styles.segmentsRow}>
            {slices.map((slice, index) => (
              <View
                key={index}
                style={[
                  styles.segment,
                  {
                    backgroundColor: slice.color,
                    flex: slice.percentage,
                  },
                ]}
              />
            ))}
          </View>

          {/* Center content */}
          {centerValue && (
            <View style={styles.donutCenter}>
              <Text style={styles.centerValue}>{centerValue}</Text>
              {centerLabel && (
                <Text style={styles.centerLabel}>{centerLabel}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {slices.filter(s => s.percentage > 0).map((slice, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {slice.label}
                </Text>
                <Text style={styles.legendValue}>{slice.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme, size: number, strokeWidth: number) {
  const innerSize = size - strokeWidth * 2;

  return StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    chartContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    chart: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ring: {
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: strokeWidth,
    },
    ringBackground: {
      borderColor: theme.border,
    },
    sliceContainer: {
      position: 'absolute',
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slice: {
      position: 'absolute',
      width: size,
      height: size / 2,
      top: 0,
      borderTopLeftRadius: size / 2,
      borderTopRightRadius: size / 2,
      transformOrigin: `${size / 2}px ${size / 2}px`,
    },
    sliceSecondHalf: {
      top: size / 2,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: size / 2,
      borderBottomRightRadius: size / 2,
    },
    centerCircle: {
      position: 'absolute',
      width: innerSize,
      height: innerSize,
      borderRadius: innerSize / 2,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerValue: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
    },
    centerLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    legend: {
      marginTop: 20,
      width: '100%',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 10,
    },
    legendText: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    legendLabel: {
      fontSize: 14,
      color: theme.text,
      flex: 1,
    },
    legendValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: size,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    // Donut chart styles
    donutContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: size / 2,
    },
    segmentsRow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: size,
      flexDirection: 'row',
    },
    segment: {
      height: '100%',
    },
    donutCenter: {
      position: 'absolute',
      width: innerSize,
      height: innerSize,
      borderRadius: innerSize / 2,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
