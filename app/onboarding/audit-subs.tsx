import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { PresetChip } from '@/components/onboarding/PresetChip';
import { AUDIT_SUBSCRIPTION_CATEGORY, subscriptionPresets } from '@/constants/onboardingPresets';
import { subscriptionsMonthlyTotal, totalHasTilde } from '@/utils/leakAudit';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';
import type { AuditSubscriptionSelection } from '@/types/onboarding';

/** Next month, same day, for the seeded recurring expense's next occurrence. */
function oneMonthOut(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

const CUSTOM_CHIP_ID = 'custom';

/**
 * Step 1: auto-pilot charges (spec 02 section 3.3). Recognition, not
 * inventory: chip grid of preset subscriptions, each tap-to-edit inline.
 * "Something else" is the one typed chip. Continue and "None of these" both
 * advance to step 2; the running total re-animates on every change (motion is
 * out of this build's scope, so the total simply updates).
 */
export default function OnboardingAuditSubsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { currency, format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { auditAnswers, saveAudit, completeStep } = useOnboarding();
  const { expenses, addExpense, updateExpense } = useExpenses();
  const { getCategoryByName } = useCategories();

  const presets = useMemo(() => subscriptionPresets(currency), [currency]);

  const [selections, setSelections] = useState<AuditSubscriptionSelection[]>(
    auditAnswers.selectedSubscriptions
  );
  const [customName, setCustomName] = useState('');
  // A ref, not state: audit_amount_edited's count only needs to be correct at
  // the moment each Set commit fires, never re-rendered from.
  const editCountRef = useRef(0);

  const findSelection = (id: string) => selections.find((s) => s.id === id);

  const toggleChip = (id: string, presetCents: number) => {
    const existing = findSelection(id);
    if (existing) {
      setSelections(selections.filter((s) => s.id !== id));
    } else {
      setSelections([...selections, { id, amountCents: presetCents, edited: false }]);
    }
  };

  const toggleCustom = () => {
    const existing = findSelection(CUSTOM_CHIP_ID);
    if (existing) {
      setSelections(selections.filter((s) => s.id !== CUSTOM_CHIP_ID));
    } else {
      setSelections([...selections, { id: CUSTOM_CHIP_ID, customName: '', amountCents: 0, edited: true }]);
    }
  };

  const commitEdit = (id: string, cents: number) => {
    setSelections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], amountCents: cents, edited: true };
      return next;
    });
    editCountRef.current += 1;
    track('audit_amount_edited', { step: 'subs', count: editCountRef.current });
  };

  const updateCustomName = (name: string) => {
    setCustomName(name);
    setSelections((prev) =>
      prev.map((s) => (s.id === CUSTOM_CHIP_ID ? { ...s, customName: name } : s))
    );
  };

  // Formula-facing view: for tilde/total purposes an item counts as "edited"
  // only when its exact price is user-set (custom chip is always exact).
  const total = subscriptionsMonthlyTotal(selections);
  const showTilde = totalHasTilde(selections);

  // Seeding rules (spec 02 section 5): each selected chip seeds one recurring
  // expense in Software & Subscriptions, cadence monthly, source 'audit'.
  // Re-running the audit matches on source + merchant (chip name) so it
  // updates rather than duplicates.
  const seedSelections = async (selected: AuditSubscriptionSelection[]) => {
    const category = getCategoryByName(AUDIT_SUBSCRIPTION_CATEGORY);
    const now = new Date();

    // Track names seeded earlier in this same pass: `expenses` is a snapshot
    // from render time and addExpense/updateExpense don't mutate it, so
    // without this a same-pass name collision (e.g. "Something else" typed
    // as a name matching a preset chip) would create a duplicate instead of
    // updating the one just written.
    const seededThisPass = new Set<string>();

    for (const sel of selected) {
      const name = sel.customName?.trim() || presets.find((p) => p.id === sel.id)?.name;
      if (!name || seededThisPass.has(name)) continue;
      seededThisPass.add(name);

      const existing = expenses.find((e) => e.source === 'audit' && e.merchant === name);
      if (existing) {
        await updateExpense(existing.id, { amount: sel.amountCents });
        continue;
      }

      await addExpense({
        title: name,
        amount: sel.amountCents,
        category: AUDIT_SUBSCRIPTION_CATEGORY,
        categoryId: category?.id,
        merchant: name,
        date: oneMonthOut(now),
        isRecurring: true,
        recurrence: 'monthly',
        reminderEnabled: false,
        source: 'audit',
      });
    }
  };

  const persistAndAdvance = async (selected: AuditSubscriptionSelection[]) => {
    const updated = {
      ...auditAnswers,
      selectedSubscriptions: selected,
      subsStepDone: true,
    };
    await saveAudit(updated);
    await seedSelections(selected);
    track('audit_subs_done', {
      selected: selected.length,
      edited: selected.filter((s) => s.edited).length,
      none: selected.length === 0,
    });
    await completeStep('audit_subs');
    router.push('/onboarding/audit-vices');
  };

  const handleContinue = () => persistAndAdvance(selections);
  const handleNoneOfThese = () => persistAndAdvance([]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>{strings.onboarding.step1Eyebrow}</Text>
        <Text style={styles.title}>{strings.onboarding.step1Title}</Text>
        <Text style={styles.sub}>{strings.onboarding.step1Sub}</Text>

        <View style={styles.grid}>
          {presets.map((preset) => {
            const sel = findSelection(preset.id);
            return (
              <PresetChip
                key={preset.id}
                name={preset.name}
                presetCents={preset.monthlyCents}
                selected={!!sel}
                editedCents={sel && (sel.edited || sel.fromScan) ? sel.amountCents : null}
                fromScan={sel?.fromScan}
                onToggle={() => toggleChip(preset.id, preset.monthlyCents)}
                onCommitEdit={(cents) => commitEdit(preset.id, cents)}
              />
            );
          })}
          <PresetChip
            name={strings.onboarding.somethingElse}
            presetCents={0}
            selected={!!findSelection(CUSTOM_CHIP_ID)}
            editedCents={null}
            isCustom
            customName={customName}
            onCustomNameChange={updateCustomName}
            onToggle={toggleCustom}
            onCommitEdit={(cents) => commitEdit(CUSTOM_CHIP_ID, cents)}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.running}>
          {strings.onboarding.runningTotalMonth(`${showTilde ? '~' : ''}${format(total)}`)}
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{strings.onboarding.continueButton}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNoneOfThese} accessibilityRole="button" style={styles.plainButton}>
          <Text style={styles.plainButtonText}>{strings.onboarding.noneOfThese}</Text>
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
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
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
