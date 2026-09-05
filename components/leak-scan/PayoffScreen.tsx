import React, { useEffect, useMemo } from 'react';
import { AccessibilityInfo, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { KeptHero } from '@/components/habit-logging/KeptHero';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { contentColumnStyle, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { DetectedHabit } from '@/types/habit';

type PayoffScreenProps = {
  /** The habit just started. Everything shown comes off its evidence block. */
  habit: DetectedHabit;
  onContinue: () => void;
};

/**
 * The payoff (PRD v3.1 sect 7.5, phase 4).
 *
 * Revives the success screen ADR 0020 retired, per ADR 0026, and earns the
 * revival by carrying something the old one never had: the user's real
 * history. "Coffee, 14 times, $84 in your statement. Skip it once and $6 comes
 * back."
 *
 * The quiet variant, always, on the scan route. Nothing has been kept yet, so
 * the kept band renders the user's true zero with its own first-skip caption
 * (the honest-zero rule, ADR 0022). A celebratory variant belongs to a route
 * that can record a skip in-flow; this one cannot, and inventing the screen
 * before the route exists would mean shipping a state nothing reaches.
 *
 * Every figure is OBSERVED, never extrapolated: a count, a total, and a
 * per-buy price. No monthly rate appears here, so the screen is immune to the
 * evidence window being short (the UX-073 class of error cannot express itself
 * on this screen).
 *
 * Deliberately motionless, composed from KeptHero which is itself motionless
 * by ruling. That keeps the release-only animation crash class away from the
 * one screen that appears at the emotional peak of the flow.
 */
export function PayoffScreen({ habit, onContinue }: PayoffScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const evidence = strings.leakScan.payoffEvidence(
    habit.name,
    habit.observedCount,
    format(habit.observedTotal),
    format(habit.averageAmount)
  );

  // The route swaps this in as a conditional render, not a navigation push, so
  // VoiceOver never moves focus here on its own (UX-013, the same reason every
  // other screen in this flow announces itself).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${strings.leakScan.payoffTitle} ${evidence}`);
  }, [evidence]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          {strings.leakScan.payoffTitle}
        </Text>
        <Text style={styles.evidence}>{evidence}</Text>

        {/* The user's own zero, with its own caption. The only accumulated
            total this app ever renders is one the user earned. */}
        <KeptHero cents={0} style={styles.hero} />

        <Text style={styles.caption}>{strings.leakScan.payoffCaption}</Text>
      </View>

      <Button label={strings.leakScan.payoffContinue} onPress={onContinue} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: spacing.gutter,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
      ...contentColumnStyle,
    },
    title: {
      fontSize: typeScale.screenTitle,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      lineHeight: 38,
      marginBottom: 10,
    },
    evidence: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 24,
      marginBottom: 24,
    },
    hero: {
      marginBottom: 16,
    },
    caption: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.mistText,
      lineHeight: 19,
    },
  });
}
