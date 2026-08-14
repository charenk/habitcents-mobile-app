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
import { spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { BeatMedia, type BeatAsset } from './BeatMedia';

export type BeatIntent = 'track' | 'scan' | 'break';

export type Beat = {
  intent: BeatIntent;
  headline: string;
  hook: string;
  cta: string;
  asset?: BeatAsset;
};

/**
 * The three beats, in the order the intent picker used, so the funnel stays
 * comparable across the change.
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
    intent: 'scan',
    headline: strings.onboarding.beatScanHeadline,
    hook: strings.onboarding.beatScanHook,
    cta: strings.onboarding.beatScanCta,
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
 * Replaces the welcome screen and the intent picker with one surface: three
 * beats, each a recording of the real app doing the thing, a hook underneath,
 * and a CTA that starts that same workflow for real.
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
      borderRadius: 4,
      backgroundColor: theme.cloud,
    },
    dotActive: {
      backgroundColor: theme.primary,
    },
  });
}
