import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDate, parseDateOnly } from '@/utils/dates';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { TierBadge } from './TierBadge';
import { categoryDisplayLabel } from '@/utils/leakScanBridge';
import { remindToggleLabel } from '@/utils/a11y';
import type { ProjectionSummary } from '@/utils/leakScan/projection';
import { track } from '@/utils/analytics';

type ProjectionSectionProps = {
  summary: ProjectionSummary;
  onSave: (remindBefore: Record<string, boolean>) => void;
  /** UX-035: true while the parent's onSave write-loop is still in flight, so
   *  this CTA disables itself instead of allowing a double tap to fire a
   *  second import pass (mirrors app/paywall.tsx's `purchasing` pattern). */
  saving?: boolean;
};

/** Month name for the "next month" label, from today's date. */
function nextMonthName(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return formatDate(d, { month: 'long' });
}

/**
 * Next-month projection (spec 5.5, visual spec 7). Renders only once coverage
 * clears a full calendar month; otherwise the pre-coverage placeholder.
 * Locked-in recurring items show a 3-payment-month amber flag; run-rate items
 * carry their own tier; buffer is a single labeled line. Save persists
 * recurring items and each item's reminder-intent toggle (v1: intent capture
 * only, no notification scheduled).
 */
/** UX-050: nextDateISO is a calendar day, not an instant. Parsed locally so a
 *  next-charge date never renders a day early; falls back to the raw string
 *  rather than rendering "Invalid Date". */
function formatNextDate(nextDateISO: string): string {
  const parsed = parseDateOnly(nextDateISO);
  return parsed ? formatDate(parsed, { month: 'short', day: 'numeric' }) : nextDateISO;
}

export function ProjectionSection({ summary, onSave, saving = false }: ProjectionSectionProps) {
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [remindBefore, setRemindBefore] = useState<Record<string, boolean>>({});
  const month = useMemo(() => nextMonthName(), []);

  if (!summary.hasFullMonth) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{strings.leakScan.projectionTitle}</Text>
        <Text style={styles.placeholder}>{strings.leakScan.projectionPlaceholder}</Text>
      </View>
    );
  }

  const toggleRemind = (stem: string) => {
    setRemindBefore((prev) => {
      const next = { ...prev, [stem]: !prev[stem] };
      track('scan_reminder_intent_set', {});
      return next;
    });
  };

  const handleSave = () => {
    // UX-035: belt-and-suspenders against a double tap, alongside the
    // disabled prop below (parent may re-render on the next tick, not this one).
    if (saving) return;
    track('scan_projection_saved', { n_recurring: summary.lockedIn.length });
    onSave(remindBefore);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.leakScan.projectionTitle}</Text>

      {summary.lockedIn.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{strings.leakScan.projectionLockedIn}</Text>
          {summary.lockedIn.map((item) => (
            <View key={item.merchantStem} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.merchantDisplay}</Text>
                {/* UX-050: nextDateISO was rendered raw; route it through the
                    app's locale-aware date formatter. Parsed as a local
                    calendar day, not a UTC instant, so a next-charge date
                    cannot render a day early west of UTC. */}
                <Text style={styles.itemNext}>{formatNextDate(item.nextDateISO)}</Text>
                {item.interval === 'biweekly' && item.nextMonthHits >= 3 && (
                  <View style={styles.flagPill}>
                    <Text style={styles.flagPillText}>
                      {strings.leakScan.threePaymentMonth(month)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.itemActions}>
                <Text style={styles.itemAmount}>{format(item.amountCents)}</Text>
                <View style={styles.remindRow}>
                  <Text style={styles.remindLabel}>{strings.leakScan.remindDayBefore}</Text>
                  <Switch
                    value={!!remindBefore[item.merchantStem]}
                    onValueChange={() => toggleRemind(item.merchantStem)}
                    accessibilityLabel={remindToggleLabel(!!remindBefore[item.merchantStem])}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {summary.runRate.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{strings.leakScan.projectionRunRate}</Text>
          {summary.runRate.map((item) => (
            <View key={item.category} style={styles.itemRow}>
              <Text style={styles.itemName}>{categoryDisplayLabel(item.category)}</Text>
              <View style={styles.itemActions}>
                <Text style={styles.itemAmount}>{format(item.medianMonthlyCents)}</Text>
                <TierBadge tier={item.tier} />
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.buffer}>{strings.leakScan.projectionBuffer}</Text>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityState={{ disabled: saving }}
      >
        <Text style={styles.saveButtonText}>{strings.leakScan.saveToHabitCents}</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.white,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 14,
    },
    title: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiBold,
      color: theme.ink,
      marginBottom: 10,
    },
    placeholder: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    group: {
      marginBottom: 14,
    },
    groupLabel: {
      // Readable section header, so slate meets the 4.5:1 floor (spec 09 §1.5).
      // UX-066: the eyebrow spec is 0.88 letterSpacing + semibold; this drifted
      // to 0.4 + bold.
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.slate,
      textTransform: 'uppercase',
      letterSpacing: typeScale.eyebrowLetterSpacing,
      marginBottom: 8,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.hairlineSubtle,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    itemNext: {
      // Next payment date is informational, so slate for AA contrast (spec 09 §1.5).
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 2,
    },
    flagPill: {
      backgroundColor: theme.tierLikelyBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.pill,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    flagPillText: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiBold,
      color: theme.tierLikelyInk,
    },
    itemActions: {
      alignItems: 'flex-end',
      gap: 4,
    },
    itemAmount: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    remindRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    remindLabel: {
      // Toggle label is readable copy, so slate for AA contrast (spec 09 §1.5).
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
    },
    buffer: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginBottom: 12,
    },
    saveButton: {
      backgroundColor: theme.primary,
      minHeight: 46,
      borderRadius: radii.control,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // UX-035: same disabled-opacity treatment as app/paywall.tsx's
    // primaryButtonDisabled.
    saveButtonDisabled: {
      opacity: 0.6,
    },
    // UX-001: ink on the sage fill; white was 2.71:1, and the disabled
    // opacity 0.6 pushed it lower still.
    saveButtonText: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiBold,
      color: theme.ink,
    },
  });
}
