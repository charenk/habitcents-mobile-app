import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
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
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (tier === 'solid') {
    return (
      <View style={[styles.pill, { backgroundColor: theme.tierSolidBg }]}>
        <View style={[styles.dotSolid, { backgroundColor: theme.tierSolidInk }]} />
        <Text style={[styles.label, { color: theme.tierSolidInk }]}>{strings.leakScan.tierSolid}</Text>
      </View>
    );
  }
  if (tier === 'likely') {
    return (
      <View style={[styles.pill, { backgroundColor: theme.tierLikelyBg }]}>
        <View style={styles.dotHalfWrap}>
          <View style={[styles.dotHalfFilled, { backgroundColor: theme.tierLikelyInk }]} />
        </View>
        <Text style={[styles.label, { color: theme.tierLikelyInk }]}>{strings.leakScan.tierLikely}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, { backgroundColor: theme.tierReviewBg }]}>
      <View style={[styles.dotRing, { borderColor: theme.tierReviewRing }]} />
      <Text style={[styles.label, { color: theme.tierReviewInk }]}>{strings.leakScan.tierReview}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 22,
      paddingHorizontal: 10,
      borderRadius: 999,
      alignSelf: 'flex-start',
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
    },
    dotSolid: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
    dotHalfWrap: {
      width: 9,
      height: 9,
      borderRadius: 5,
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
      borderRadius: 5,
      borderWidth: 2,
      backgroundColor: 'transparent',
    },
  });
}
