import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { BeatMedia, type BeatAsset } from './BeatMedia';

// The scan beat was removed 2026-09-05 (decision 0009): the leak scan is
// dormant behind SCAN_FLOW_ENABLED, and a beat whose CTA cannot start its
// real workflow is the one thing ADR 0026 forbids. The analytics enum keeps
// its 'scan' member (utils/analytics.ts) so the funnel stays readable across
// the change; it simply stops being fired.
export type BeatIntent = 'track' | 'break';

export type Beat = {
  intent: BeatIntent;
  headline: string;
  hook: string;
  cta: string;
  asset?: BeatAsset;
};

/**
 * The beats, in the order the intent picker used, so the funnel stays
 * comparable across the change. Two since decision 0009 (the scan beat sat
 * between these two); every count in this file reads beats.length, so the
 * dots, the paging and the "step n of total" hint all followed on their own.
 *
 * `asset` is absent until the captures land (see
 * design/captures/onboarding-beats/RUNBOOK.md). BeatMedia renders an honest
 * empty frame meanwhile rather than a mock-up, which is the entire point of
 * ADR 0026: beats show the real app or they show nothing.
 */
export const BEATS: Beat[] = [
  {
    intent: 'track',
    headline: strings.onboarding.beatTrackHeadline,
    hook: strings.onboarding.beatTrackHook,
    cta: strings.onboarding.beatTrackCta,
  },
  {
    intent: 'break',
    headline: strings.onboarding.beatBreakHeadline,
    hook: strings.onboarding.beatBreakHook,
    cta: strings.onboarding.beatBreakCta,
  },
];

type OnboardingCarouselProps = {
  /** Start the beat's REAL workflow. Never a preview of one. */
  onPick: (intent: BeatIntent) => void;
  onSkip: () => void;
  /** Test seam for the beats, including their assets. */
  beats?: Beat[];
};

/**
 * The onboarding carousel (PRD v3.1 sect 4, ADR 0026).
 *
 * Replaces the welcome screen and the intent picker with one surface: a beat
 * per real workflow, each a recording of the app doing the thing, a hook
 * underneath, and a CTA that starts that same workflow for real.
 *
 * Rules that do not bend (sect 10):
 *  - No auto-advance. The user moves it, or it does not move.
 *  - Rubber-band at both ends, which the platform ScrollView gives for free.
 *  - Back never steps between beats; paging is swipe and dots only.
 *
 * Deliberately built on a plain paging ScrollView with no reanimated work at
 * all. Two release builds have been crashed by animation on this codebase, and
 * a carousel is the last place to spend that risk: the platform already does
 * paging and rubber-banding natively, and beats-as-recordings means there are
 * no scenes to animate.
 */
export function OnboardingCarousel({ onPick, onSkip, beats = BEATS }: OnboardingCarouselProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [index, setIndex] = useState(0);
  const lastIndexRef = useRef(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      const clamped = Math.max(0, Math.min(beats.length - 1, next));
      if (clamped === lastIndexRef.current) return;
      lastIndexRef.current = clamped;
      setIndex(clamped);
    },
    [width, beats.length]
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // Rubber-band at both ends (sect 10) is the platform default; naming it
        // here so a future "tidy up" does not switch it off.
        bounces
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {beats.map((beat, i) => (
          <View key={beat.intent} style={[styles.beat, { width }]}>
            <BeatMedia asset={beat.asset} accessibilityLabel={beat.headline} />
            <Text style={styles.headline} accessibilityRole="header">
              {beat.headline}
            </Text>
            <Text style={styles.hook}>{beat.hook}</Text>
            <Button
              label={beat.cta}
              onPress={() => onPick(beat.intent)}
              style={styles.cta}
              accessibilityHint={strings.onboarding.beatProgress(i + 1, beats.length)}
            />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View
          style={styles.dots}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={strings.onboarding.beatProgress(index + 1, beats.length)}
        >
          {beats.map((beat, i) => (
            <View
              key={beat.intent}
              style={[styles.dot, i === index ? styles.dotActive : null]}
              importantForAccessibility="no"
            />
          ))}
        </View>

        <Button label={strings.onboarding.skipForNow} variant="tertiary" onPress={onSkip} />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    pager: {
      flex: 1,
    },
    beat: {
      paddingHorizontal: spacing.gutter,
      paddingTop: 12,
      justifyContent: 'center',
    },
    headline: {
      fontSize: typeScale.displayMid,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      lineHeight: 34,
      marginTop: 24,
    },
    hook: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 20,
      marginTop: 8,
      marginBottom: 20,
    },
    cta: {
      alignSelf: 'stretch',
    },
    footer: {
      paddingHorizontal: spacing.gutter,
      alignItems: 'center',
      gap: 12,
    },
    dots: {
      flexDirection: 'row',
      gap: 8,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: radii.micro,
      backgroundColor: theme.cloud,
    },
    dotActive: {
      backgroundColor: theme.primary,
    },
  });
}
