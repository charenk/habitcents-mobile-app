/**
 * The long arc card (design/redesign-handoff/04-screens.md, "Habit detail
 * (R9)"; product rules in docs/design-package-phase2/01-habit-logging-spec.md
 * section 4.6).
 *
 * Reads top to bottom as one sentence: how far along, who that makes you, and
 * the promise that a slip never takes it back. The lavender segmented track
 * replaces the old progress ring, because the four chapters are the thing the
 * user is moving through, and a ring cannot show where one chapter ends and the
 * next begins.
 *
 * Two invariants, both load-bearing:
 * 1. The track is driven by `arcProgress(displayTotal)` and can only ever grow.
 *    `displayTotal` is already max(totalSkips, highestMilestoneReached), and the
 *    animation additionally refuses any target below the highest value it has
 *    shown, so a same-day correction can never animate the arc backward.
 * 2. The chapter name is supplied by the caller from `displayChapter(...)` for
 *    the same reason: the chapter never falls.
 *
 * Segment widths are the chapter ranges themselves (10 / 20 / 20 / 16 skips of
 * the 66), so the track is a true scale rather than four equal boxes.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { arcProgress, identityLineForTotal } from '@/utils/habitLogging';
import { arcLabel } from '@/utils/a11y';
import { motion, radii, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import type { ChapterName } from '@/types/habit';
import { strings } from '@/constants/strings';
import { useReducedMotion } from '@/utils/motion';

const ARC_TOTAL = 66;

// Section 4.6 names only Deciding / Rhythm / Cruising / Rewired as the four
// track segments (Rewiring is the identity-line/chapter-label stage between
// Cruising and Rewired, not its own segment on the track). The lo/hi pairs are
// both the fill math and the 10 / 20 / 20 / 16 segment weights.
const CHAPTERS: { name: ChapterName; lo: number; hi: number; label: string }[] = [
  { name: 'Deciding', lo: 0, hi: 10, label: strings.habitLogging.chapterDeciding },
  { name: 'Rhythm', lo: 10, hi: 30, label: strings.habitLogging.chapterRhythm },
  { name: 'Cruising', lo: 30, hi: 50, label: strings.habitLogging.chapterCruising },
  { name: 'Rewired', lo: 50, hi: 66, label: strings.habitLogging.chapterRewired },
];

type LongArcProps = {
  /** Display total: max(live totalSkips, highestMilestoneReached) so the arc never falls (spec 4.6, 9). */
  displayTotal: number;
  /** Chapter to name in the pill, from displayChapter(...) so it never moves backward. */
  chapter: ChapterName;
};

export function LongArc({ displayTotal, chapter }: LongArcProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reduceMotion = useReducedMotion();

  const target = arcProgress(displayTotal);
  const progress = useRef(new Animated.Value(target)).current;
  // Highest fraction ever shown. The arc grows toward a new high and ignores
  // anything lower, so it never animates downward.
  const highWater = useRef(target);

  useEffect(() => {
    if (target <= highWater.current) return;
    highWater.current = target;
    if (reduceMotion) {
      progress.setValue(target);
      return;
    }
    Animated.timing(progress, {
      toValue: target,
      duration: motion.screen,
      easing: Easing.bezier(...motion.easing),
      // Width cannot run on the native driver. This node uses this one driver
      // only; never mix drivers on it (release-build crash class).
      useNativeDriver: false,
    }).start();
  }, [target, reduceMotion, progress]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{strings.habitLogging.longArcTitle}</Text>
        <View style={styles.pill} accessible accessibilityLabel={arcLabel(displayTotal, chapter)}>
          <Text style={styles.pillText}>{strings.habitDetailV2.arcPill(displayTotal, chapter)}</Text>
        </View>
      </View>

      <Text style={styles.identityLine}>{identityLineForTotal(displayTotal)}</Text>
      <Text style={styles.supportLine}>{strings.habitLogging.arcSupportLine(displayTotal)}</Text>

      {/*
        The ring's geometry was silent: the pill beside it says "30 of 66
        skips, Cruising", but the bar itself was an unlabeled decorative View,
        so VoiceOver either skipped it or stopped on an empty node. Given the
        real semantics (progressbar with a value), the rotor can report it and
        the track's children stay hidden as the decoration they are.
        accessibilityValue was used nowhere in the app before this.
      */}
      <View
        style={styles.trackRow}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={arcLabel(displayTotal, chapter)}
        accessibilityValue={{ min: 0, max: ARC_TOTAL, now: displayTotal }}
      >
        {CHAPTERS.map((c) => (
          <View key={c.name} style={[styles.trackSegment, { flex: c.hi - c.lo }]}>
            <Animated.View
              style={[
                styles.trackFill,
                {
                  width: progress.interpolate({
                    inputRange: [c.lo / ARC_TOTAL, c.hi / ARC_TOTAL],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labelsRow}>
        {CHAPTERS.map((c) => (
          <Text
            key={c.name}
            style={[styles.trackLabel, { flex: c.hi - c.lo }, c.name === chapter && styles.trackLabelActive]}
          >
            {c.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 18,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 12,
    },
    title: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.body,
      color: theme.ink,
    },
    pill: {
      backgroundColor: theme.coachMomentMilestoneBg,
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    // Ink on the lavender tint, not lavender on lavender: the prototype's
    // lavender-on-14%-lavender pill text is 2.9:1, below AA for this size.
    pillText: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.eyebrow,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    identityLine: {
      fontFamily: theme.fonts.displayItalic,
      // Batch 2: token, was a literal 20. Unifies with ViewQuote's identical
      // displayItalic use, which moves from 19 to this same quote (20).
      fontSize: typeScale.quote,
      lineHeight: 26,
      color: theme.ink,
    },
    supportLine: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      lineHeight: 18,
      color: theme.mistText,
      marginTop: 6,
      fontVariant: ['tabular-nums'],
    },
    trackRow: {
      flexDirection: 'row',
      gap: 5,
      marginTop: 18,
    },
    trackSegment: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.cloud,
      overflow: 'hidden',
    },
    trackFill: {
      height: '100%',
      backgroundColor: theme.lavender,
      borderRadius: 3,
    },
    labelsRow: {
      flexDirection: 'row',
      gap: 5,
      marginTop: 7,
    },
    trackLabel: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.eyebrow,
      color: theme.mistText,
    },
    trackLabelActive: {
      fontFamily: theme.fonts.uiSemibold,
      color: theme.slate,
    },
  });
}
