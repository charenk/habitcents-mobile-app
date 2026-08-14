import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { BiggestLeakCard } from './BiggestLeakCard';
import { useTrackLeak } from './useTrackLeak';
import { track } from '@/utils/analytics';
import { bucketCents } from '@/utils/analytics';
import type { HabitCandidate } from '@/utils/leakScan/types';

type DeckScreenProps = {
  /** The deck, already selected and ranked (utils/leakScan/deck.ts). */
  candidates: HabitCandidate[];
  /** Evidence-window length, the rate divisor (UX-073). */
  spanDays: number;
  /** Suppress this merchant and drop its card. */
  onDismiss: (candidate: HabitCandidate) => void;
  /** Leave the deck for the full breakdown. Also the all-dismissed exit. */
  onSeeEverything: () => void;
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
  onBack,
}: DeckScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Tracking is shared with the results ladder so the two cannot drift on what
  // "break this one" does, including the activation that completes onboarding.
  const { trackLeak, sheet } = useTrackLeak(spanDays, onSeeEverything);

  // The route swaps this screen in as a conditional render rather than a real
  // navigation push, so VoiceOver never shifts focus here on its own (UX-013,
  // the same reason ResultsScreen and IntakeScreen announce themselves).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(strings.leakScan.deckTitle);
  }, []);

  // One impression per card per position, not one per render. Without the ref
  // the position-1 track rate (the success criterion for the whole ranking
  // signal, PRD sect 11) would be divided by a render count.
  const shownRef = useRef(new Set<string>());
  useEffect(() => {
    candidates.forEach((candidate, i) => {
      const key = `${i + 1}:${candidate.merchantStem}`;
      if (shownRef.current.has(key)) return;
      shownRef.current.add(key);
      track('deck_card_shown', {
        position: i + 1,
        merchant_category: candidate.category,
        instances: candidate.occurrences,
        total_cents: bucketCents(candidate.totalCents),
      });
    });
  }, [candidates]);

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
                track('deck_card_result', { position: i + 1, result: 'tracked' });
                void trackLeak(candidate);
              }}
              onDismiss={() => {
                track('deck_card_result', { position: i + 1, result: 'dismissed' });
                onDismiss(candidate);
              }}
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
