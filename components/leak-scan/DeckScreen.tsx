import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { contentColumnStyle, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { BiggestLeakCard } from './BiggestLeakCard';
import { useTrackLeak } from './useTrackLeak';
import { bucketCents, track } from '@/utils/analytics';
import type { HabitCandidate } from '@/utils/leakScan/types';
import type { DetectedHabit } from '@/types/habit';

type DeckScreenProps = {
  /** The deck, already selected and ranked (utils/leakScan/deck.ts). */
  candidates: HabitCandidate[];
  /** Evidence-window length, the rate divisor (UX-073). */
  spanDays: number;
  /** Suppress this merchant and drop its card. */
  onDismiss: (candidate: HabitCandidate) => void;
  /** Leave the deck for the full breakdown. Also the all-dismissed exit. */
  onSeeEverything: () => void;
  /** A habit was started: the route shows the payoff from its evidence. */
  onActivated: (habit: DetectedHabit) => void;
  onBack: () => void;
};

/**
 * The habit deck (PRD v3.1 sect 7.3, phase 3).
 *
 * Up to three cards, each one a decision: track it, or say it is not a habit.
 * The results dashboard this replaces is an analyst's report handed to a
 * minute-two user; the same evidence shaped as a choice is what the flow
 * actually needs at this point.
 *
 * Cards reuse BiggestLeakCard rather than growing a near-identical sibling, so
 * the evidence line keeps its honest hasReliableRate branching: a monthly rate
 * only once the window supports one, an observed total otherwise.
 */
export function DeckScreen({
  candidates,
  spanDays,
  onDismiss,
  onSeeEverything,
  onActivated,
  onBack,
}: DeckScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Deal-time positions, frozen on the first non-empty render. Dismissing a
  // card shifts the survivors down the array, so the render index is NOT the
  // position the criterion means: without this, dismissing card 1 manufactured
  // a second position-1 impression and could attribute card 2's outcome to
  // position 1 (review round 3, P2-b). The deck is dealt exactly once per scan
  // (one-hop rule), so freezing here is safe.
  const dealRef = useRef<string[] | null>(null);
  if (dealRef.current === null && candidates.length > 0) {
    dealRef.current = candidates.map((c) => c.merchantStem);
  }
  const dealPosition = (stem: string): number => (dealRef.current?.indexOf(stem) ?? -1) + 1;

  // Tracking is shared with the results ladder so the two cannot drift on what
  // "break this one" does, including the activation that completes onboarding.
  // deck_card_result 'tracked' fires HERE, on a real start, never on sheet
  // open: a cancel or a paywall bounce is not a tracked card, and counting it
  // as one inflated the position-1 track rate (review round 3, P2-c).
  const { trackLeak, sheet } = useTrackLeak(spanDays, (habit, candidate) => {
    track('deck_card_result', {
      position: dealPosition(candidate.merchantStem),
      result: 'tracked',
    });
    onActivated(habit);
  });

  // The route swaps this screen in as a conditional render rather than a real
  // navigation push, so VoiceOver never shifts focus here on its own (UX-013,
  // the same reason ResultsScreen and IntakeScreen announce themselves).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(strings.leakScan.deckTitle);
  }, []);

  // One impression per card, keyed on the stem alone (not the render index:
  // see dealRef above), at its deal-time position. Without the ref the
  // position-1 track rate (the success criterion for the whole ranking signal,
  // PRD sect 11) would be divided by a render count.
  const shownRef = useRef(new Set<string>());
  useEffect(() => {
    candidates.forEach((candidate) => {
      if (shownRef.current.has(candidate.merchantStem)) return;
      shownRef.current.add(candidate.merchantStem);
      track('deck_card_shown', {
        position: dealPosition(candidate.merchantStem),
        merchant_category: candidate.category,
        instances: candidate.occurrences,
        total_cents_bucket: bucketCents(candidate.totalCents),
      });
    });
    // dealPosition is a render-scope helper over a ref; candidates is the real
    // dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  // No in-flight guard here on purpose. Dismissing a card unmounts it, so the
  // same card cannot be double-tapped, and dropping a SECOND card's dismissal
  // would be worse than the race it prevents. The concurrent-write hazard is
  // real but belongs at the write: useLeakScanIntake serializes the rule
  // updates onto one queue (review round 3, P3-2).
  const handleDismiss = (candidate: HabitCandidate) => {
    track('deck_card_result', {
      position: dealPosition(candidate.merchantStem),
      result: 'dismissed',
    });
    onDismiss(candidate);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.title} accessibilityRole="header">
          {strings.leakScan.deckTitle}
        </Text>
        <Text style={styles.subtitle}>{strings.leakScan.deckSubtitle}</Text>

        <View style={styles.cards}>
          {candidates.map((candidate, i) => (
            <BiggestLeakCard
              key={candidate.merchantStem}
              candidate={candidate}
              spanDays={spanDays}
              eyebrow={i === 0 ? undefined : strings.leakScan.deckAlsoEyebrow}
              onBreak={() => {
                // No result event here: 'tracked' is a started habit, and that
                // is reported by the onStarted callback above.
                void trackLeak(candidate);
              }}
              onDismiss={() => handleDismiss(candidate)}
            />
          ))}
        </View>

        {/* The terminal exit. Rejecting everything lands here too, which is the
            one permitted fallback hop: the full list is never itself fallen
            back from. */}
        <Button
          label={strings.leakScan.deckSeeEverything}
          variant="tertiary"
          onPress={onSeeEverything}
          style={styles.seeEverything}
        />
      </ScrollView>

      {sheet}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: spacing.gutter,
      paddingTop: 8,
      ...contentColumnStyle,
    },
    title: {
      fontSize: typeScale.screenTitle,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      lineHeight: 38,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 20,
      marginBottom: 20,
    },
    cards: {
      gap: 12,
    },
    seeEverything: {
      alignSelf: 'center',
      marginTop: 20,
    },
  });
}
