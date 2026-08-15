import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useReducedMotion } from '@/utils/motion';

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
  const reduceMotion = useReducedMotion();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (asset?.poster) {
    return (
      <Image
        source={asset.poster}
        style={styles.frame}
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
      style={[styles.frame, styles.pending]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID="beat-media-pending"
    >
      <Text style={styles.pendingText}>{strings.onboarding.beatMediaPending}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    frame: {
      width: '100%',
      // Portrait phone capture, the shape a recording of the real app makes.
      aspectRatio: 9 / 16,
      maxHeight: 380,
      borderRadius: radii.feature,
      backgroundColor: theme.snow,
      borderWidth: 1,
      borderColor: theme.border,
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
