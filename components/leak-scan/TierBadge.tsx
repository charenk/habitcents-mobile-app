import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, spacing, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useStrings } from '@/utils/i18n';
import type { ConfidenceTier } from '@/utils/leakScan/types';

type TierBadgeProps = {
  tier: ConfidenceTier;
};

/**
 * The tier-badge primitive (visual spec section 2), reused on KPI cards,
 * category rows, habit cards, and projection lines. Shape + label carries the
 * meaning, never color alone: solid is a filled disc, likely a half disc
 * (approximated with a background-punched dot), needs-review a hollow ring.
 * Never a raw percentage (spec section 4).
 */
export function TierBadge({ tier }: TierBadgeProps) {
  const theme = useTheme();
  const strings = useStrings();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (tier === 'solid') {
    return (
      <View style={[styles.pill, { backgroundColor: theme.tierSolidBg }]}>
        <View style={[styles.dotSolid, { backgroundColor: theme.tierSolidInk }]} />
        <Text style={[styles.label, { color: theme.tierSolidInk }]} maxFontSizeMultiplier={1.5}>{strings.leakScan.tierSolid}</Text>
      </View>
    );
  }
  if (tier === 'likely') {
    return (
      <View style={[styles.pill, { backgroundColor: theme.tierLikelyBg }]}>
        <View style={styles.dotHalfWrap}>
          <View style={[styles.dotHalfFilled, { backgroundColor: theme.tierLikelyInk }]} />
        </View>
        <Text style={[styles.label, { color: theme.tierLikelyInk }]} maxFontSizeMultiplier={1.5}>{strings.leakScan.tierLikely}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, { backgroundColor: theme.tierReviewBg }]}>
      <View style={[styles.dotRing, { borderColor: theme.tierReviewRing }]} />
      <Text style={[styles.label, { color: theme.tierReviewInk }]} maxFontSizeMultiplier={1.5}>{strings.leakScan.tierReview}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      // minHeight, not height: this pill wraps 11pt text that scales with the
      // user's text size, and a fixed 22 clipped it. The badge renders three
      // times in KpiRow alone plus once per HabitCard, so it was the first
      // thing to break on the leak-scan results screen at large type.
      minHeight: 22,
      paddingVertical: 2,
      paddingHorizontal: 10,
      borderRadius: 999,
      alignSelf: 'flex-start',
    },
    label: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiBold,
    },
    dotSolid: {
      width: 9,
      height: 9,
      // 9pt discs: radii.pill guarantees a full circle. radii.micro (4) would
      // fall short of the 4.5 a 9px round needs and square the corners.
      borderRadius: radii.pill,
    },
    dotHalfWrap: {
      width: 9,
      height: 9,
      borderRadius: radii.pill,
      overflow: 'hidden',
      backgroundColor: theme.tierLikelyBg,
    },
    dotHalfFilled: {
      width: 9,
      height: 9,
      // Half-disc: left half filled, right half shows the pill background
      // through the wrapper's overflow-hidden mask.
      marginLeft: -4.5,
    },
    dotRing: {
      width: 9,
      height: 9,
      borderRadius: radii.pill,
      borderWidth: 2,
      backgroundColor: 'transparent',
    },
  });
}
