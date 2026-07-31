import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ViceRow } from '@/components/onboarding/ViceRow';
import { vicePresets, type FrequencyBand } from '@/constants/onboardingPresets';
import { vicesWeeklyTotal } from '@/utils/leakAudit';
import { typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';
import type { AuditViceSelection } from '@/types/onboarding';

/**
 * Step 2: everyday rhythm (spec 02 section 3.4). Three vice rows, each a
 * per-item value (tap-to-edit) and a 4-segment frequency band. No default
 * selection; an unanswered row counts as Never in the math but is tracked
 * separately in analytics ("answered" count).
 */
export default function OnboardingAuditVicesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { currency, format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { auditAnswers, saveAudit, completeStep, skipStep } = useOnboarding();

  const presets = useMemo(() => vicePresets(currency), [currency]);

  const initial: AuditViceSelection[] =
    auditAnswers.viceAnswers.length > 0
      ? auditAnswers.viceAnswers
      : presets.map((p) => ({
          id: p.id,
          perItemCents: p.perItemCents,
          edited: false,
          band: 'never' as FrequencyBand,
          answered: false,
        }));

  const [answers, setAnswers] = useState<AuditViceSelection[]>(initial);
  const [editCount, setEditCount] = useState(0);

  const answerFor = (id: string) => answers.find((a) => a.id === id)!;

  const setBand = (id: string, band: FrequencyBand) => {
    setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, band, answered: true } : a)));
  };

  const commitEdit = (id: string, cents: number) => {
    setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, perItemCents: cents, edited: true } : a)));
    setEditCount((c) => c + 1);
    track('audit_amount_edited', { step: 'vices', count: editCount + 1 });
  };

  const weeklyTotal = vicesWeeklyTotal(answers);

  const persistAndAdvance = async (finalAnswers: AuditViceSelection[], skipped: boolean) => {
    const updated = {
      ...auditAnswers,
      viceAnswers: finalAnswers,
      vicesStepDone: true,
    };
    await saveAudit(updated);
    const answeredCount = finalAnswers.filter((a) => a.answered).length;
    track('audit_vices_done', { answered: answeredCount, skipped });
  };

  const handleSeeMyLeak = async () => {
    await persistAndAdvance(answers, false);
    await completeStep('audit_vices');
    router.push('/onboarding/reveal');
  };

  const handleSkip = async () => {
    await persistAndAdvance(answers, true);
    await skipStep('audit_vices');
    router.push('/onboarding/reveal');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>{strings.onboarding.step2Eyebrow}</Text>
        <Text style={styles.title}>{strings.onboarding.step2Title}</Text>
        <Text style={styles.sub}>{strings.onboarding.step2Sub}</Text>

        {presets.map((preset) => {
          const a = answerFor(preset.id);
          return (
            <ViceRow
              key={preset.id}
              name={preset.name}
              presetCents={preset.perItemCents}
              editedCents={a.edited ? a.perItemCents : null}
              band={a.band}
              onBandChange={(band) => setBand(preset.id, band)}
              onCommitEdit={(cents) => commitEdit(preset.id, cents)}
            />
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.running}>{strings.onboarding.runningWeekly(format(weeklyTotal))}</Text>
        <Button
          label={strings.onboarding.seeMyLeak}
          onPress={handleSeeMyLeak}
          style={styles.primaryButton}
        />
        <Button
          label={strings.onboarding.skipThisStep}
          onPress={handleSkip}
          variant="tertiary"
          style={styles.plainButton}
        />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      // Step eyebrows read in sage-dark (redesign spec 03 path C); sage-dark
      // clears 4.5:1 on snow, so the contrast floor still holds.
      color: theme.primaryDark,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    title: {
      fontSize: 30,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      marginBottom: 6,
      lineHeight: 34,
    },
    sub: {
      fontSize: 14,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      lineHeight: 20,
      marginBottom: 18,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 14,
      alignItems: 'center',
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.cloud,
    },
    running: {
      fontSize: 20,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.ink,
      marginBottom: 12,
    },
    primaryButton: {
      width: '100%',
    },
    plainButton: {
      marginTop: 4,
    },
  });
}
