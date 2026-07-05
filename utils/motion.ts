/**
 * Direction C motion + haptics layer (P2-4, spec 05; docs/design-package-
 * phase2/06-p2-4b-direction/Direction C Motion Layer.html). Motion is
 * concentrated exclusively on the two money moments: the log save (key-press
 * springs, save button morphs to a check) and the skip (button spring,
 * expanding ring, week-dot pop, Kept hero count-up with pulse). Every one of
 * them honors prefers-reduced-motion with an instant fallback; haptics are
 * not visual and keep firing regardless of the reduce-motion setting.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Tracks the platform's reduce-motion preference. Read once on mount and kept
 * live via AccessibilityInfo's change event, matching the pattern already
 * used by components/habit-logging/KeptHero.tsx.
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { if (mounted) setReduceMotion(!!v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => {
      if (mounted) setReduceMotion(!!v);
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduceMotion;
}

/** Success haptic for the skip moment and the log-save moment. Best effort; never throws. */
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Light impact haptic for a key press / lower-weight tap. Best effort; never throws. */
export function hapticLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
