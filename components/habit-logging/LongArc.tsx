import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { arcProgress, identityLineForTotal } from '@/utils/habitLogging';
import type { AppTheme } from '@/constants/theme';
import type { ChapterName } from '@/types/habit';
import { strings } from '@/constants/strings';

// Section 4.6 names only Deciding / Rhythm / Cruising / Rewired as the four
// track segments (Rewiring is the identity-line/chapter-label stage between
// Cruising and Rewired, not its own segment on the track).
const CHAPTERS: { name: ChapterName; lo: number; hi: number; label: string }[] = [
  { name: 'Deciding', lo: 0, hi: 10, label: strings.habitLogging.chapterDeciding },
  { name: 'Rhythm', lo: 10, hi: 30, label: strings.habitLogging.chapterRhythm },
  { name: 'Cruising', lo: 30, hi: 50, label: strings.habitLogging.chapterCruising },
  { name: 'Rewired', lo: 50, hi: 66, label: strings.habitLogging.chapterRewired },
];

type LongArcProps = {
  /** Display total: max(live totalSkips, highestMilestoneReached) so the arc never falls (spec §4.6, §9). */
  displayTotal: number;
};

/**
 * The long arc identity card on the habit detail screen (spec 01 §4.6).
 * Replaces the old longest-streak stat and milestone marker row entirely.
 */
export function LongArc({ displayTotal }: LongArcProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const progress = arcProgress(displayTotal);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{strings.habitLogging.longArcTitle}</Text>
      <View style={styles.topRow}>
        <View
          accessible
          accessibilityLabel={`${displayTotal} of 66 skips`}
          style={styles.ringOuter}
        >
          <ProgressRing progress={progress} color={theme.primary} trackColor={theme.border} />
          <View style={styles.ringInner}>
            <Text style={styles.ringNumber}>{strings.habitLogging.arcOf66(displayTotal)}</Text>
            <Text style={styles.ringLabel}>{strings.habitLogging.arcOf66Label}</Text>
          </View>
        </View>
        <View style={styles.textCol}>
          <Text style={styles.identityLine}>{identityLineForTotal(displayTotal)}</Text>
          <Text style={styles.supportLine}>{strings.habitLogging.arcSupportLine(displayTotal)}</Text>
        </View>
      </View>

      <View style={styles.trackRow}>
        {CHAPTERS.map((c) => {
          const fill =
            displayTotal >= c.hi ? 1 : displayTotal <= c.lo ? 0 : (displayTotal - c.lo) / (c.hi - c.lo);
          return (
            <View key={c.name} style={styles.trackSegment}>
              <View style={[styles.trackFill, { width: `${fill * 100}%` }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {CHAPTERS.map((c) => (
          <Text key={c.name} style={styles.trackLabel}>{c.label}</Text>
        ))}
      </View>
    </View>
  );
}

const RING_SIZE = 84;
const RING_INNER = 64;

/**
 * A conic-style progress ring built from the standard two-half-disc pie
 * technique (no SVG dependency). Each half of the ring is a STATIC half-disc
 * clip window (fixed, does not rotate) containing a ROTATING half-disc fill
 * pivoting at the ring's own center via `transformOrigin` (RN 0.74+; this
 * project is on 0.81). Two same-radius, same-center half-discs offset by
 * angle theta overlap in an area that is exactly linear in theta (a circular
 * sector), which is what makes the fill fraction track `progress` linearly:
 * rotating the fill from 0deg to 180deg sweeps its overlap with the static
 * clip from fully covered down to fully clear.
 *
 * Right half fills first as progress goes 0 -> 0.5 (12 o'clock to 6 o'clock,
 * clockwise through 3 o'clock). Left half then fills as progress goes
 * 0.5 -> 1 (6 o'clock back to 12 o'clock, clockwise through 9 o'clock),
 * completing the ring. `progress` is 0-1.
 */
function ProgressRing({ progress, color, trackColor }: { progress: number; color: string; trackColor: string }) {
  const clamped = Math.max(0, Math.min(1, progress));
  const angle = clamped * 360;
  // Fill rotates AWAY from full coverage as theta goes 0 -> 180 (per the
  // overlap formula, overlap fraction = (180 - theta) / 180). To grow the
  // visible fill as progress increases, rotate by (180 - progressAngle) so
  // theta shrinks from 180 (no overlap) to 0 (full overlap) as progress rises.
  const rightFillRotation = 180 - Math.min(angle, 180);
  const leftFillRotation = 180 - Math.max(0, Math.min(angle, 360) - 180);

  return (
    <View style={[ringStyles.base, { backgroundColor: trackColor }]}>
      <View style={ringStyles.clipRight}>
        <View
          style={[
            ringStyles.fillRight,
            { backgroundColor: color, transform: [{ rotate: `${rightFillRotation}deg` }] },
          ]}
        />
      </View>
      <View style={ringStyles.clipLeft}>
        <View
          style={[
            ringStyles.fillLeft,
            { backgroundColor: color, transform: [{ rotate: `${leftFillRotation}deg` }] },
          ]}
        />
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  base: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
  // Static clip windows: fixed half-discs, never rotate. Each is shaped to
  // the ring's curvature via matching border-radius on the outer corners, so
  // overflow:hidden clips to a true half-disc, not just a rectangle.
  clipRight: {
    position: 'absolute',
    width: RING_SIZE / 2,
    height: RING_SIZE,
    left: RING_SIZE / 2,
    top: 0,
    borderTopRightRadius: RING_SIZE / 2,
    borderBottomRightRadius: RING_SIZE / 2,
    overflow: 'hidden',
  },
  clipLeft: {
    position: 'absolute',
    width: RING_SIZE / 2,
    height: RING_SIZE,
    left: 0,
    top: 0,
    borderTopLeftRadius: RING_SIZE / 2,
    borderBottomLeftRadius: RING_SIZE / 2,
    overflow: 'hidden',
  },
  // Rotating fills: full-size half-discs, oversized on the outer edge so the
  // clip window (not the fill's own shape) is always the limiting boundary.
  // Pivot is the clip window's inner edge (the ring's true center) via
  // transformOrigin, matching the overlap-area derivation above.
  fillRight: {
    position: 'absolute',
    width: RING_SIZE / 2,
    height: RING_SIZE,
    left: 0,
    top: 0,
    borderTopRightRadius: RING_SIZE / 2,
    borderBottomRightRadius: RING_SIZE / 2,
    transformOrigin: 'left center',
  },
  fillLeft: {
    position: 'absolute',
    width: RING_SIZE / 2,
    height: RING_SIZE,
    left: 0,
    top: 0,
    borderTopLeftRadius: RING_SIZE / 2,
    borderBottomLeftRadius: RING_SIZE / 2,
    transformOrigin: 'right center',
  },
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    ringOuter: {
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius: RING_SIZE / 2,
      backgroundColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    ringInner: {
      width: RING_INNER,
      height: RING_INNER,
      borderRadius: RING_INNER / 2,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    ringLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.textSecondary,
      letterSpacing: 0.5,
    },
    textCol: {
      flex: 1,
    },
    identityLine: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      lineHeight: 20,
    },
    supportLine: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 3,
      lineHeight: 17,
    },
    trackRow: {
      flexDirection: 'row',
      gap: 5,
      marginTop: 14,
    },
    trackSegment: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      overflow: 'hidden',
    },
    trackFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 3,
    },
    labelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 5,
    },
    trackLabel: {
      fontSize: 10.5,
      fontWeight: '600',
      color: theme.textSecondary,
    },
  });
}
