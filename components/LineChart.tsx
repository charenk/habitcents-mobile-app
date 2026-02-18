import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

type DataPoint = {
  value: number;
  label: string;
};

type LineChartProps = {
  data: DataPoint[];
  height?: number;
  showLabels?: boolean;
  showGrid?: boolean;
  lineColor?: string;
  fillColor?: string;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export function LineChart({
  data,
  height = 160,
  showLabels = true,
  showGrid = true,
  lineColor,
  fillColor,
}: LineChartProps) {
  const theme = useTheme();
  const actualLineColor = lineColor || theme.primary;
  const actualFillColor = fillColor || theme.primary + '20';
  const styles = useMemo(() => createStyles(theme, height), [theme, height]);

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const chartWidth = SCREEN_WIDTH - 72; // Account for padding
  const chartHeight = height - 40; // Account for labels

  // Calculate min/max for scaling
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Calculate point positions
  const points = useMemo(() => {
    const pointSpacing = chartWidth / (data.length - 1 || 1);
    return data.map((point, index) => {
      const x = index * pointSpacing;
      const normalizedValue = (point.value - minValue) / range;
      const y = chartHeight - normalizedValue * chartHeight;
      return { x, y, ...point };
    });
  }, [data, chartWidth, chartHeight, minValue, range]);

  // Format value for display
  const formatValue = (cents: number): string => {
    return `$${Math.round(cents / 100)}`;
  };

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = (chartHeight / steps) * i;
      const value = maxValue - (range / steps) * i;
      lines.push({ y, value });
    }
    return lines;
  }, [chartHeight, maxValue, range]);

  return (
    <View style={styles.container}>
      {/* Y-axis labels */}
      {showGrid && (
        <View style={styles.yAxis}>
          {gridLines.map((line, index) => (
            <Text key={index} style={styles.yAxisLabel}>
              {formatValue(line.value)}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.chartArea}>
        {/* Grid lines */}
        {showGrid && (
          <View style={styles.gridContainer}>
            {gridLines.map((line, index) => (
              <View
                key={index}
                style={[styles.gridLine, { top: line.y }]}
              />
            ))}
          </View>
        )}

        {/* Fill area */}
        <View style={styles.fillContainer}>
          {points.length > 1 && (
            <View
              style={[
                styles.fillArea,
                {
                  backgroundColor: actualFillColor,
                  height: chartHeight,
                },
              ]}
            >
              {/* Create polygon-like fill using multiple views */}
              {points.map((point, index) => {
                if (index === points.length - 1) return null;
                const nextPoint = points[index + 1];
                const width = nextPoint.x - point.x;
                const minY = Math.min(point.y, nextPoint.y);
                const maxY = Math.max(point.y, nextPoint.y);

                return (
                  <View
                    key={index}
                    style={[
                      styles.fillSegment,
                      {
                        left: point.x,
                        width,
                        top: minY,
                        height: chartHeight - minY,
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Line segments */}
        <View style={styles.lineContainer}>
          {points.map((point, index) => {
            if (index === points.length - 1) return null;
            const nextPoint = points[index + 1];

            // Calculate line angle and length
            const dx = nextPoint.x - point.x;
            const dy = nextPoint.y - point.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
              <View
                key={index}
                style={[
                  styles.lineSegment,
                  {
                    left: point.x,
                    top: point.y,
                    width: length,
                    backgroundColor: actualLineColor,
                    transform: [
                      { translateY: -1 },
                      { rotate: `${angle}deg` },
                    ],
                    transformOrigin: 'left center',
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Data points */}
        <View style={styles.pointsContainer}>
          {points.map((point, index) => (
            <View
              key={index}
              style={[
                styles.point,
                {
                  left: point.x - 4,
                  top: point.y - 4,
                  backgroundColor: actualLineColor,
                },
              ]}
            />
          ))}
        </View>

        {/* X-axis labels */}
        {showLabels && (
          <View style={styles.xAxisLabels}>
            {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1).map((point, index) => (
              <Text
                key={index}
                style={[styles.xAxisLabel, { left: point.x - 20 }]}
              >
                {point.label}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme, height: number) {
  const chartHeight = height - 40;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      height,
    },
    yAxis: {
      width: 40,
      justifyContent: 'space-between',
      paddingVertical: 0,
    },
    yAxisLabel: {
      fontSize: 10,
      color: theme.textTertiary,
      textAlign: 'right',
      paddingRight: 8,
    },
    chartArea: {
      flex: 1,
      height: chartHeight,
      position: 'relative',
    },
    gridContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    gridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: theme.border,
    },
    fillContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    },
    fillArea: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    fillSegment: {
      position: 'absolute',
      backgroundColor: 'transparent',
    },
    lineContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    lineSegment: {
      position: 'absolute',
      height: 2,
      borderRadius: 1,
    },
    pointsContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    point: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.surface,
    },
    xAxisLabels: {
      position: 'absolute',
      bottom: -24,
      left: 0,
      right: 0,
      height: 20,
    },
    xAxisLabel: {
      position: 'absolute',
      width: 40,
      fontSize: 10,
      color: theme.textTertiary,
      textAlign: 'center',
    },
    emptyContainer: {
      height,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
  });
}
