/**
 * useSegmentPager: the swipe half of a segmented switcher.
 *
 * A screen with segments owns its selected value as it always did; this hook
 * adds a horizontal pager beside that control and keeps the two in sync in
 * both directions. Taps move the pager, swipes move the value. Today has
 * worked this way since ADR 0019; Money and Insights joined it on 2026-09-06,
 * which is why the plumbing moved here rather than being copied a third time.
 *
 * The implementation is deliberately boring, and must stay that way. It is a
 * plain horizontal ScrollView with pagingEnabled and native scrolling only:
 * no react-native-gesture-handler, no Reanimated worklets, no mixed animation
 * drivers. design/INCIDENT-build5-launch-crash.md names the animation layer in
 * two release-build crashes whose root cause was never confirmed, and the app
 * holds zero imports of those libraries as the containment line. A swipe that
 * needs one of them is a swipe this app does not ship.
 *
 * Rejected on 2026-09-06 for the same reason, plus its own: a cross-page swipe
 * that carries past the last segment into the next tab. A paging ScrollView
 * cannot hand a gesture past its own bounds without one of those libraries;
 * the boundary between "next segment" and "left the page" is invisible;
 * segment counts differ per tab so no muscle memory forms; a right swipe at
 * the first segment collides with the iOS back gesture; it implies a sliding
 * tab transition against the house rule that tab switches are instant; and
 * VoiceOver users gain nothing from it. The tab bar stays the one way to
 * change pages. See design/decisions/components/SegmentPager.md.
 *
 * Motion: the swipe itself is direct manipulation and is never suppressed. A
 * tap scrolls the pager, and that scroll is the one thing reduced motion turns
 * off, so it jump-cuts instead. The very first positioning (a default or a
 * deep link) is always silent, because nobody asked for it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from 'react-native';
import { useReducedMotion } from './motion';

export type SegmentPagerOptions<V extends string> = {
  /** The segment values, left to right. Order is the pager's page order. */
  values: readonly V[];
  /** The screen's current selection. The screen stays the source of truth. */
  value: V;
  /**
   * Fired only when a settle lands on a page that is not the current value,
   * so a tap's own programmatic scroll never reports itself as a swipe.
   */
  onSwipe: (landed: V) => void;
};

export function useSegmentPager<V extends string>({ values, value, onSwipe }: SegmentPagerOptions<V>) {
  const pagerRef = useRef<ScrollView>(null);
  const [pagerReady, setPagerReady] = useState(false);
  const layoutDone = useRef(false);
  // False until the first tap or swipe, so init positioning stays silent
  // regardless of the reduced-motion setting: it never animates anyway.
  const interacted = useRef(false);
  const { width: screenWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const markInteracted = useCallback(() => {
    interacted.current = true;
  }, []);

  const handleLayout = useCallback(() => {
    if (layoutDone.current) return;
    layoutDone.current = true;
    setPagerReady(true);
  }, []);

  const index = values.indexOf(value);

  useEffect(() => {
    if (!pagerReady || index < 0) return;
    pagerRef.current?.scrollTo({
      x: index * screenWidth,
      y: 0,
      animated: interacted.current && !reducedMotion,
    });
  }, [pagerReady, index, screenWidth, reducedMotion]);

  /**
   * Both settle events land here.
   *
   * onScrollEndDrag as well as onMomentumScrollEnd because a slow drag can be
   * released with no velocity, which settles the page without ever producing
   * momentum: the pager would show one segment while the control showed
   * another. OnboardingCarousel has always wired both; Today wired only
   * momentum and carried that gap until this hook.
   *
   * Firing twice is harmless: the second event lands on a page that already
   * matches `value`, and the inequality below drops it. That same inequality
   * is what stops a tap from being counted as a swipe.
   */
  const handleSettle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!screenWidth) return;
      // Clamped because rubber-band overshoot at either end can report an
      // offset just outside the page range.
      const raw = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
      const landedIndex = Math.min(Math.max(raw, 0), values.length - 1);
      const landed = values[landedIndex];
      interacted.current = true;
      if (landed !== value) onSwipe(landed);
    },
    [screenWidth, values, value, onSwipe]
  );

  return {
    screenWidth,
    markInteracted,
    pagerProps: {
      ref: pagerRef,
      horizontal: true as const,
      pagingEnabled: true as const,
      // Keeps a vertical list scroll inside a pane from stealing sideways.
      directionalLockEnabled: true as const,
      showsHorizontalScrollIndicator: false as const,
      scrollEventThrottle: 16,
      onMomentumScrollEnd: handleSettle,
      onScrollEndDrag: handleSettle,
      onLayout: handleLayout,
    },
    /**
     * Per-pane props. Panes all stay mounted so each keeps its own scroll
     * position, which means the off-screen ones have to be hidden from
     * assistive tech explicitly: without this pair a screen reader would walk
     * straight into a pane the user cannot see.
     */
    paneProps: (paneValue: V) => {
      const active = paneValue === value;
      return {
        // flexGrow is inert on native: the pager's contentContainer is a row
        // with the default alignItems stretch, so each pane is already full
        // height and there is no free main-axis space to claim. On web,
        // pagingEnabled wraps each pane in a snap-align div that does NOT
        // stretch its child, which leaves a centered zero state with no height
        // to centre in; flexGrow fills that wrapper.
        style: { width: screenWidth, flexGrow: 1 },
        accessibilityElementsHidden: !active,
        importantForAccessibility: (active ? 'auto' : 'no-hide-descendants') as 'auto' | 'no-hide-descendants',
      };
    },
  };
}
