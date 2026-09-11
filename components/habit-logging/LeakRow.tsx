/**
 * LeakRow: one merchant in Today's Leaks section, at two densities (Charen,
 * annotation set 3, 2026-09-10).
 *
 * Candidate density: tile, name, the last-7-days evidence strip, and an
 * observed subline. No action - the row is a nudge that fills as the pattern
 * forms, so there is no disabled Break pretending otherwise, and no numeric
 * threshold promise (the old "n of 4" meter could reach a permanently full
 * bar and lie; see modules/today.md 2026-09-11).
 *
 * Detected density: the same row grown up. Bigger name, the evidence
 * sentence detection actually stands behind, Break it / Not this one as real
 * buttons (never swipe-only: the crash-containment line in
 * utils/useSegmentPager.ts bans gesture libraries, and the spec bans
 * swipe-only actions), and the DT-1 coach slot under the first detected row.
 *
 * Dot language (locked 2026-09-10): evidence dots are NEUTRAL - a mist $ on
 * a cloud fill for a day with a buy, a cloud ring otherwise. Green stays
 * positive-only, so spending never wears sage; the green $ belongs to kept
 * days on the check-in card's WeekStrip.
 *
 * The row draws no card chrome: Today wraps a detected row in its own card
 * and stacks candidate rows inside one shared card with hairline separators.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmojiTile } from '@/components/ui/EmojiTile';
import { Icon } from '@/components/ui/Icon';
import { CoachMomentSlot } from '@/components/habit-logging/CoachMomentSlot';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

const DOT_SIZE = 20;

type LeakRowDetectedProps = {
  /** The evidence sentence (reliable rate or observed total). */
  evidence: string;
  /** The keep-logging hint under an observed-only evidence line. */
  evidenceHint?: string;
  breakLabel: string;
  onBreak: () => void;
  onDismiss: () => void;
  /** DT-1 prose; rendered under the buttons on at most one row. */
  coachText?: string;
};

export type LeakRowProps = {
  emoji: string;
  tint: string;
  name: string;
  /** Last 7 days, oldest first; true = at least one buy that day. */
  days7: boolean[];
  /** Candidate density's subline ("$13.00 so far · 2 buys"). */
  candidateEvidence?: string;
  /** Present = detected density. */
  detected?: LeakRowDetectedProps;
};

export function LeakRow({
  emoji,
  tint,
  name,
  days7,
  candidateEvidence,
  detected,
}: LeakRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const buyDays = days7.filter(Boolean).length;
  const strip = (
    <View
      style={styles.strip}
      accessible
      accessibilityLabel={strings.habitLogging.leakStripLabel(buyDays)}
    >
      {days7.map((hasBuy, i) => (
        <View key={i} style={[styles.dot, hasBuy ? styles.dotBuy : styles.dotNone]}>
          {hasBuy && <Icon name="DollarSign" size={11} color={theme.mistText} />}
        </View>
      ))}
    </View>
  );

  if (!detected) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`${name}, ${candidateEvidence ?? ''}`}
      >
        <EmojiTile emoji={emoji} size={36} color={tint} />
        <View style={styles.column}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {strip}
          <Text style={styles.subline} numberOfLines={1}>
            {candidateEvidence}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row} accessible accessibilityLabel={`${name}, ${detected.evidence}`}>
        <EmojiTile emoji={emoji} size={36} color={tint} />
        <View style={styles.column}>
          <Text style={styles.nameDetected} numberOfLines={1}>
            {name}
          </Text>
          {strip}
        </View>
      </View>
      <Text style={styles.evidence}>{detected.evidence}</Text>
      {detected.evidenceHint ? <Text style={styles.evidenceHint}>{detected.evidenceHint}</Text> : null}
      <View style={styles.buttonsRow}>
        <Button
          label={detected.breakLabel}
          onPress={detected.onBreak}
          variant="primary"
          style={styles.breakButton}
        />
        <Button
          label={strings.habitLogging.notThisOne}
          onPress={detected.onDismiss}
          variant="secondary"
        />
      </View>
      {detected.coachText ? <CoachMomentSlot text={detected.coachText} /> : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: spacing.stack,
    },
    column: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.label,
      color: theme.ink,
    },
    nameDetected: {
      fontFamily: theme.fonts.uiSemibold,
      fontSize: typeScale.button,
      color: theme.ink,
    },
    strip: {
      flexDirection: 'row',
      gap: 5,
      marginTop: spacing.xs,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // A day with a buy: neutral evidence, never sage (green positive-only).
    dotBuy: {
      backgroundColor: theme.cloud,
    },
    dotNone: {
      borderWidth: 1.5,
      borderColor: theme.cloud,
    },
    subline: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      color: theme.slate,
      marginTop: spacing.tight,
      fontVariant: ['tabular-nums'],
    },
    evidence: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.label,
      lineHeight: 19,
      color: theme.slate,
      marginTop: spacing.hairline,
      fontVariant: ['tabular-nums'],
    },
    evidenceHint: {
      fontFamily: theme.fonts.ui,
      fontSize: typeScale.caption,
      lineHeight: 18,
      color: theme.mistText,
      marginTop: spacing.hairline,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    breakButton: {
      flex: 1,
    },
  });
}
