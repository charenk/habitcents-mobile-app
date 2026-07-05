import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ViceRow } from '@/components/onboarding/ViceRow';
import { vicePresets, type FrequencyBand } from '@/constants/onboardingPresets';
import { vicesWeeklyTotal } from '@/utils/leakAudit';
import type { AppTheme } from '@/constants/theme';
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
        <TouchableOpacity style={styles.primaryButton} onPress={handleSeeMyLeak} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{strings.onboarding.seeMyLeak}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} accessibilityRole="button" style={styles.plainButton}>
          <Text style={styles.plainButtonText}>{strings.onboarding.skipThisStep}</Text>
        </TouchableOpacity>
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
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: theme.textTertiary,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 6,
      letterSpacing: -0.3,
    },
    sub: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      alignItems: 'center',
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    running: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 10,
    },
    primaryButton: {
      minHeight: 48,
      width: '100%',
      borderRadius: 14,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.white,
    },
    plainButton: {
      marginTop: 10,
      minHeight: 44,
      justifyContent: 'center',
    },
    plainButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
  });
}
