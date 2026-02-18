import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

type ProgressRingProps = {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  centerLabel?: string;
  centerValue?: string;
  showPercentage?: boolean;
};

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 12,
  color,
  backgroundColor,
  centerLabel,
  centerValue,
  showPercentage = true,
}: ProgressRingProps) {
  const theme = useTheme();
  const actualColor = color || theme.primary;
  const actualBgColor = backgroundColor || theme.border;
  const styles = useMemo(
    () => createStyles(theme, size, strokeWidth, actualColor, actualBgColor),
    [theme, size, strokeWidth, actualColor, actualBgColor]
  );

  const clampedProgress = Math.max(0, Math.min(100, progress));
  const innerSize = size - strokeWidth * 2;

  // Create segments for the ring
  // We'll use a simplified approach with quadrants
  const progressAngle = (clampedProgress / 100) * 360;

  return (
    <View style={styles.container}>
      {/* Background ring */}
      <View style={styles.ring}>
        {/* Progress arc using overlapping semi-circles */}
        {progressAngle > 0 && (
          <View style={styles.progressContainer}>
            {/* First half (0-180 degrees) */}
            <View style={styles.halfContainer}>
              <View
                style={[
                  styles.halfRing,
                  styles.halfRingRight,
                  {
                    backgroundColor: actualColor,
                    transform: [
                      { rotate: `${Math.min(progressAngle, 180)}deg` },
                    ],
                  },
                ]}
              />
              {/* Cover for incomplete first half */}
              {progressAngle < 180 && (
                <View
                  style={[
                    styles.halfRing,
                    styles.halfRingRight,
                    { backgroundColor: actualBgColor },
                  ]}
                />
              )}
            </View>

            {/* Second half (180-360 degrees) */}
            {progressAngle > 180 && (
              <View style={styles.halfContainerLeft}>
                <View
                  style={[
                    styles.halfRing,
                    styles.halfRingLeft,
                    {
                      backgroundColor: actualColor,
                      transform: [
                        { rotate: `${progressAngle - 180}deg` },
                      ],
                    },
                  ]}
                />
              </View>
            )}
          </View>
        )}

        {/* Inner circle (center) */}
        <View style={styles.innerCircle}>
          {showPercentage && !centerValue && (
            <>
              <Text style={styles.percentageText}>{Math.round(clampedProgress)}%</Text>
              {centerLabel && <Text style={styles.labelText}>{centerLabel}</Text>}
            </>
          )}
          {centerValue && (
            <>
              <Text style={styles.valueText}>{centerValue}</Text>
              {centerLabel && <Text style={styles.labelText}>{centerLabel}</Text>}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// Alternative simpler implementation using a progress bar wrapped in a circle
export function SimpleProgressRing({
  progress,
  size = 120,
  strokeWidth = 12,
  color,
  backgroundColor,
  centerLabel,
  centerValue,
  showPercentage = true,
}: ProgressRingProps) {
  const theme = useTheme();
  const actualColor = color || theme.primary;
  const actualBgColor = backgroundColor || theme.border;
  const styles = useMemo(
    () => createSimpleStyles(theme, size, strokeWidth, actualColor, actualBgColor),
    [theme, size, strokeWidth, actualColor, actualBgColor]
  );

  const clampedProgress = Math.max(0, Math.min(100, progress));
  const innerSize = size - strokeWidth * 2;

  return (
    <View style={styles.container}>
      <View style={styles.ring}>
        {/* Background track */}
        <View style={[styles.track, { borderColor: actualBgColor }]} />

        {/* Progress track - we'll show it as a visual indicator */}
        <View style={[styles.progressTrack, { borderColor: actualColor }]}>
          {/* Show progress as border segments */}
          {clampedProgress > 0 && (
            <View
              style={[
                styles.progressIndicator,
                {
                  width: `${clampedProgress}%`,
                  backgroundColor: actualColor,
                },
              ]}
            />
          )}
        </View>

        {/* Center content */}
        <View style={styles.center}>
          {showPercentage && !centerValue && (
            <>
              <Text style={styles.percentageText}>{Math.round(clampedProgress)}%</Text>
              {centerLabel && <Text style={styles.labelText}>{centerLabel}</Text>}
            </>
          )}
          {centerValue && (
            <>
              <Text style={styles.valueText}>{centerValue}</Text>
              {centerLabel && <Text style={styles.labelText}>{centerLabel}</Text>}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function createStyles(
  theme: AppTheme,
  size: number,
  strokeWidth: number,
  color: string,
  bgColor: string
) {
  const innerSize = size - strokeWidth * 2;
  const halfSize = size / 2;

  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    ring: {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: strokeWidth,
      borderColor: bgColor,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    progressContainer: {
      position: 'absolute',
      width: size,
      height: size,
      top: -strokeWidth,
      left: -strokeWidth,
    },
    halfContainer: {
      position: 'absolute',
      width: halfSize,
      height: size,
      right: 0,
      overflow: 'hidden',
    },
    halfContainerLeft: {
      position: 'absolute',
      width: halfSize,
      height: size,
      left: 0,
      overflow: 'hidden',
    },
    halfRing: {
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: strokeWidth,
      borderColor: 'transparent',
    },
    halfRingRight: {
      right: 0,
      borderRightColor: 'inherit',
      transformOrigin: 'center center',
    },
    halfRingLeft: {
      left: 0,
      borderLeftColor: 'inherit',
      transformOrigin: 'center center',
    },
    innerCircle: {
      width: innerSize - 4,
      height: innerSize - 4,
      borderRadius: (innerSize - 4) / 2,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    percentageText: {
      fontSize: size / 5,
      fontWeight: '700',
      color: theme.text,
    },
    valueText: {
      fontSize: size / 5,
      fontWeight: '700',
      color: theme.text,
    },
    labelText: {
      fontSize: size / 10,
      color: theme.textSecondary,
      marginTop: 2,
    },
  });
}

function createSimpleStyles(
  theme: AppTheme,
  size: number,
  strokeWidth: number,
  color: string,
  bgColor: string
) {
  const innerSize = size - strokeWidth * 2;

  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    ring: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    track: {
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: strokeWidth,
    },
    progressTrack: {
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    progressIndicator: {
      height: strokeWidth,
      borderRadius: strokeWidth / 2,
    },
    center: {
      width: innerSize,
      height: innerSize,
      borderRadius: innerSize / 2,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    percentageText: {
      fontSize: size / 5,
      fontWeight: '700',
      color: theme.text,
    },
    valueText: {
      fontSize: size / 5,
      fontWeight: '700',
      color: theme.text,
    },
    labelText: {
      fontSize: size / 10,
      color: theme.textSecondary,
      marginTop: 2,
    },
  });
}
