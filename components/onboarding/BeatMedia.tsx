import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import { useReducedMotion } from '@/utils/motion';
import { CHROME_MAX_FONT_SCALE, useAccessibilityTextSize } from '@/utils/textScale';

/** Portrait height the frame takes when there is room for the full 9:16 card. */
const PORTRAIT_MAX_HEIGHT = 380;
/**
 * Height of the band the frame becomes at accessibility text sizes.
 *
 * A constant rather than a shrink curve, because what the number has to buy is
 * a specific thing: enough room under the hook for the CTA to sit on screen at
 * AX1 without a scroll. A proportional shrink left it about 90pt short there
 * (walked on the simulator), and no curve makes AX4 or AX5 fit anyway, which
 * is what the beat's own scroller is for.
 */
const ACCESSIBILITY_BAND_HEIGHT = 120;

export type BeatAsset = {
  /**
   * Still frame. REQUIRED once assets exist, and not a placeholder for the
   * video: it IS the reduced-motion rendering, so a beat without a poster
   * cannot honour the accessibility rule (ADR 0026).
   */
  poster?: ImageSourcePropType;
  /**
   * Looping capture of the real app performing this beat. Optional, and
   * absent today.
   *
   * Playback needs a native video module (`expo-video`), which is NOT a
   * dependency of this app yet. Adding it forces the next build to be a fresh
   * native build rather than an OTA update, so it is deliberately left for
   * whoever lands the real captures; the prop and the contract exist so that
   * change is additive rather than a rewrite of this component.
   */
  video?: number;
};

type BeatMediaProps = {
  asset: BeatAsset | undefined;
  /** Spoken description; the media is decorative without it. */
  accessibilityLabel: string;
};

/**
 * The media frame in a carousel beat (ADR 0026).
 *
 * The rule the ADR exists to enforce: beats show the REAL app, recorded, never
 * a hand-built simulation of it. A simulated scene drifts silently every time
 * the app is redesigned; a recording can only ever be out of date, which is a
 * re-capture chore and a visible one.
 *
 * Three states, in priority order:
 *  1. reduced motion, or no video: the poster still.
 *  2. video present and motion allowed: the looping capture (pending the
 *     native module, see BeatAsset.video).
 *  3. nothing captured yet: a labelled empty frame, so the carousel is
 *     honestly incomplete rather than quietly showing a fake.
 */
export function BeatMedia({ asset, accessibilityLabel }: BeatMediaProps) {
  const theme = useTheme();
  const strings = useStrings();
  const reduceMotion = useReducedMotion();
  const accessibilityText = useAccessibilityTextSize();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * DYNAMIC TYPE. The 9:16 card is width-derived from its height, so shrinking
   * it vertically also narrows it: at AX3 a height-limited portrait frame is
   * about 90pt wide, too narrow to hold its own label and too narrow to read a
   * recording of a phone screen in. So above the accessibility threshold the
   * frame stops being a portrait card and becomes a full-width band instead,
   * short enough to leave the headline, hook and CTA on screen. `cover` crops
   * a portrait poster to its middle rather than letterboxing it to nothing.
   *
   * Named here rather than left to flexShrink because the amount of room the
   * text needs is what decides this, and a shrink factor cannot say that. The
   * beat scrolls underneath it either way (OnboardingCarousel), which is what
   * catches AX4 and AX5 where no frame size leaves the CTA on screen.
   */
  const sizing = accessibilityText ? styles.band : styles.portrait;

  if (asset?.poster) {
    return (
      <Image
        source={asset.poster}
        style={[styles.frame, sizing]}
        resizeMode="cover"
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        // Referenced so the reduced-motion branch is explicit rather than
        // implied: with a video module wired up, this is the switch.
        testID={reduceMotion ? 'beat-media-static' : 'beat-media-poster'}
      />
    );
  }

  return (
    <View
      style={[styles.frame, sizing, styles.pending]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID="beat-media-pending"
    >
      <Text
        style={styles.pendingText}
        // Chrome, not content: this line says what is missing, and letting it
        // scale past the cap is what pushed it out of its own frame (textScale
        // rule 1).
        maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}
      >
        {strings.onboarding.beatMediaPending}
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    frame: {
      width: '100%',
      // The beat container centres on the main axis but sets no alignItems, so
      // without this a frame narrower than the column sits against the left
      // gutter while every other element still spans full width. Centred here
      // rather than with alignItems on the beat, because headline and hook rely
      // on the container's default stretch to stay full-width and left-aligned.
      alignSelf: 'center',
      borderRadius: radii.feature,
      backgroundColor: theme.snow,
      borderWidth: 1,
      borderColor: theme.border,
    },
    band: {
      height: ACCESSIBILITY_BAND_HEIGHT,
    },
    portrait: {
      // Portrait phone capture, the shape a recording of the real app makes.
      aspectRatio: 9 / 16,
      maxHeight: PORTRAIT_MAX_HEIGHT,
      // maxHeight wins over width on a phone: 9/16 of the full content width is
      // taller than 380, so yoga shrinks the box below 100% to keep the ratio.
      // Applied only below the accessibility threshold; see `sizing` above for
      // why the ratio is dropped rather than shrunk.
      flexShrink: 1,
    },
    pending: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    pendingText: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.mistText,
      textAlign: 'center',
    },
  });
}
