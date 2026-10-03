import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { Catalog } from '@/utils/i18n';
import { useStrings } from '@/utils/i18n';
import { BeatMedia, type BeatAsset } from './BeatMedia';

// The scan beat was removed 2026-09-05 (decision 0009): the leak scan is
// dormant behind SCAN_FLOW_ENABLED, and a beat whose CTA cannot start its
// real workflow is the one thing ADR 0026 forbids. The analytics enum keeps
// its 'scan' member (utils/analytics.ts) so the funnel stays readable across
// the change; it simply stops being fired.
// 'bills' joined with arc v2 (2026-09-18): its CTA opens the real add-bill
// sheet on Money > Upcoming, so it passes the same rule.
export type BeatIntent = 'track' | 'break' | 'bills';

export type Beat = {
  intent: BeatIntent;
  headline: string;
  hook: string;
  cta: string;
  asset?: BeatAsset;
};

/**
 * The beats, hook-first (arc v2, onboarding story arc canvas, Charen
 * 2026-09-18): the differentiated promise leads, the mechanism follows, bills
 * close. This deliberately ends the old order's funnel comparability; the
 * carousel-level events shipped 2026-09-17 are the new baseline, and
 * beat-position versus completion is the question they exist to answer.
 * Every count in this file reads activeBeats.length, so the dots, the paging
 * and the "step n of total" hint all follow on their own.
 *
 * `asset` is absent until the captures land (see
 * design/captures/onboarding-beats/RUNBOOK.md). BeatMedia renders an honest
 * empty frame meanwhile rather than a mock-up, which is the entire point of
 * ADR 0026: beats show the real app or they show nothing.
 */
export function buildBeats(strings: Catalog): Beat[] {
  return [
    {
      intent: 'break',
      headline: strings.onboarding.beatBreakHeadline,
      hook: strings.onboarding.beatBreakHook,
      cta: strings.onboarding.beatBreakCta,
    },
    {
      intent: 'track',
      headline: strings.onboarding.beatTrackHeadline,
      hook: strings.onboarding.beatTrackHook,
      cta: strings.onboarding.beatTrackCta,
    },
    {
      intent: 'bills',
      headline: strings.onboarding.beatBillsHeadline,
      hook: strings.onboarding.beatBillsHook,
      cta: strings.onboarding.beatBillsCta,
    },
  ];
}

/** English fixture, kept for the default prop shape and as a test seam. */
export const BEATS: Beat[] = buildBeats(strings);

type OnboardingCarouselProps = {
  /** Start the beat's REAL workflow. Never a preview of one. */
  onPick: (intent: BeatIntent) => void;
  onSkip: () => void;
  /** Test seam for the beats, including their assets. */
  beats?: Beat[];
  /**
   * A beat became the active page, including the first one at mount.
   *
   * Fires on every settle, duplicates included: paging is what this component
   * knows about, and "seen once" is a funnel question. The screen dedupes
   * (app/onboarding/welcome.tsx), which keeps analytics policy in the one file
   * that already owns the rest of this flow's events.
   */
  onBeatViewed?: (intent: BeatIntent, index: number) => void;
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
export function OnboardingCarousel({ onPick, onSkip, beats, onBeatViewed }: OnboardingCarouselProps) {
  const theme = useTheme();
  const strings = useStrings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const localizedBeats = useMemo(() => buildBeats(strings), [strings]);
  const activeBeats = beats ?? localizedBeats;
  const [index, setIndex] = useState(0);
  const lastIndexRef = useRef(0);

  // The first beat is viewed by arriving, not by paging, so the scroll handler
  // below never reports it. Without this the funnel would count everyone who
  // swiped and nobody who landed.
  useEffect(() => {
    const first = activeBeats[0];
    if (!first) return;
    onBeatViewed?.(first.intent, 0);
    // Mount only: a later `beats` change is a test seam, not a new view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      const clamped = Math.max(0, Math.min(activeBeats.length - 1, next));
      if (clamped === lastIndexRef.current) return;
      lastIndexRef.current = clamped;
      setIndex(clamped);
      const beat = activeBeats[clamped];
      if (beat) onBeatViewed?.(beat.intent, clamped);
    },
    [width, activeBeats, onBeatViewed]
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        horizontal
        pagingEnabled
        // The beats are scrollers of their own now, so the pager is no longer
        // findable by type. Named so the funnel tests can page it.
        testID="onboarding-pager"
        showsHorizontalScrollIndicator={false}
        // Rubber-band at both ends (sect 10) is the platform default; naming it
        // here so a future "tidy up" does not switch it off.
        bounces
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {activeBeats.map((beat, i) => (
          /**
           * Each beat scrolls vertically inside the horizontal pager.
           *
           * It used to be a fixed View that centred its children, which meant
           * the only element able to absorb larger text was the text: at AX1
           * the CTA was sliced in half by the footer and from AX3 up it was off
           * the screen entirely, so the one thing the screen exists to offer
           * could not be tapped. The two spacers below centre the block while
           * it fits and collapse to nothing once it does not, which is what
           * makes the overflow reachable; `justifyContent: 'center'` cannot do
           * the second half (RN centres overflowing content by pushing the top
           * out of the scrollable area, where no gesture can reach it).
           */
          <ScrollView
            key={beat.intent}
            style={{ width }}
            contentContainerStyle={styles.beat}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.beatSpacer} />
            <BeatMedia asset={beat.asset} accessibilityLabel={beat.headline} />
            <Text style={styles.headline} accessibilityRole="header">
              {beat.headline}
            </Text>
            <Text style={styles.hook}>{beat.hook}</Text>
            <Button
              label={beat.cta}
              onPress={() => onPick(beat.intent)}
              style={styles.cta}
              accessibilityHint={strings.onboarding.beatProgress(i + 1, activeBeats.length)}
            />
            <View style={styles.beatSpacer} />
          </ScrollView>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View
          style={styles.dots}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={strings.onboarding.beatProgress(index + 1, activeBeats.length)}
        >
          {activeBeats.map((beat, i) => (
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
      flexGrow: 1,
      paddingHorizontal: spacing.gutter,
      paddingTop: 12,
      paddingBottom: 12,
    },
    // Equal-weight slack above and below the block: the pair centres it when
    // there is room and collapses to zero when there is not. flexBasis 0 is
    // what makes the collapse total rather than leaving two stray gaps.
    beatSpacer: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
    },
    // Both line heights stay written at their 1x values on purpose. React
    // Native scales `lineHeight` by the system font scale alongside `fontSize`
    // whenever allowFontScaling is on, so multiplying them here applies the
    // scale twice: at AX1 the hook's leading came out near double its own
    // text and the copy read as a list rather than a sentence.
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
