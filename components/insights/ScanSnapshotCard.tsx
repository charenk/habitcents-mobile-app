/**
 * "Leak finder" segment on the Insights tab (W5, OB-6 Insights half, ADR
 * 0020), for an install that ran a scan before the flow went dormant.
 *
 * Renders the persisted ScanSummary (types/scanSummary.ts) verbatim: every
 * figure here was already shown on the results screen at scan time and is
 * never recomputed. The summary is kept until the next successful scan
 * replaces it, no expiry; the footer says which of those two worlds this
 * build is in (decision 0009).
 *
 * Reuses two results-screen primitives that only need summary-shaped data,
 * never a live ScanResult: KpiRow (kpi: KpiSummary) and TierBadge (tier
 * only). Category and leak rows are built fresh at card scale, since the
 * results screen's own CategoryList/HabitCard expect live ScanResult rows to
 * drill into, which a persisted snapshot does not carry (privacy: only the
 * rollup survives, never the raw rows).
 */
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { radii, spacing, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { formatDate } from '@/utils/dates';
import { KpiRow } from '@/components/leak-scan/KpiRow';
import { TierBadge } from '@/components/leak-scan/TierBadge';
import { Button } from '@/components/ui';
import { MIN_SPAN_DAYS_FOR_RATE } from '@/utils/habitDetection';
import { SCAN_FLOW_ENABLED } from '@/utils/scanFlow';
import type { ScanSummary } from '@/types/scanSummary';

type ScanSnapshotCardProps = {
  summary: ScanSummary;
};

export function ScanSnapshotCard({ summary }: ScanSnapshotCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Re-scan entry (build 12): the only prior paths to /leak-scan were
  // onboarding's own Door 2 pushes. useCompleteScanOnboarding is already
  // guarded on isOnboardingComplete(), so re-entering here post-onboarding
  // is a harmless no-op there; app/leak-scan.tsx's intake screen carries its
  // own back pill and the results screen replaces this summary on success.
  const handleRunNewScan = useCallback(() => {
    router.push('/leak-scan');
  }, [router]);

  const dateLabel = formatDate(summary.createdAt, { month: 'short', day: 'numeric' });
  const eyebrow = strings.insights.scanSnapshotEyebrow(dateLabel);

  const windowLabel =
    summary.evidence.windowStart && summary.evidence.windowEnd
      ? `${formatDate(summary.evidence.windowStart, { month: 'short', day: 'numeric' })} to ${formatDate(
          summary.evidence.windowEnd,
          { month: 'short', day: 'numeric' }
        )}`
      : null;
  const evidenceLine = strings.insights.scanEvidenceLine(
    summary.evidence.fileCount,
    summary.evidence.rowCount,
    windowLabel
  );

  // Same evidence-window floor LeaksCard uses (hasReliableRate): under it, an
  // extrapolated monthly figure would overstate a few days of data, so every
  // leak states what was actually observed instead. The scan's topLeaks all
  // share one evidence window (summarize.ts), so this is a single check
  // for the whole list rather than a per-row one.
  const reliableRate = summary.kpis.spanDays >= MIN_SPAN_DAYS_FOR_RATE;

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.eyebrow} accessibilityRole="header">
          {eyebrow}
        </Text>
        <Text style={styles.evidenceLine}>{evidenceLine}</Text>
      </View>

      <KpiRow kpi={summary.kpis} />

      {summary.categories.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            {strings.insights.whereItWentTitle}
          </Text>
          {summary.categories.map((category) => {
            const amount = format(category.totalCents);
            const widthPercent = Math.max(2, Math.round(category.share * 100));
            return (
              <View
                key={category.name}
                style={styles.categoryRow}
                accessible
                accessibilityLabel={`${category.name}, ${amount}`}
              >
                <View style={styles.categoryLabels}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <Text style={styles.categoryAmount}>{amount}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${widthPercent}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {summary.topLeaks.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            {strings.insights.leaksTitle}
          </Text>
          {summary.topLeaks.map((leak, index) => {
            const summaryLine = reliableRate
              ? strings.insights.leakSummary(format(leak.monthlyCents), leak.buys)
              : strings.insights.leakSummaryObserved(format(leak.observedCents), leak.buys);
            return (
              <View
                key={`${leak.name}-${index}`}
                style={[
                  styles.leakRow,
                  index < summary.topLeaks.length - 1 ? styles.rowDivider : null,
                ]}
              >
                <View style={styles.leakText}>
                  <Text style={styles.leakName} numberOfLines={1}>
                    {leak.name}
                  </Text>
                  <Text style={styles.leakSummaryLine} numberOfLines={1}>
                    {summaryLine}
                  </Text>
                </View>
                <TierBadge tier={leak.tier} />
              </View>
            );
          })}
          <Text style={styles.caption}>{strings.insights.scanLeaksCaption}</Text>
        </View>
      )}

      {summary.projection && (
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            {strings.leakScan.projectionTitle}
          </Text>
          <Text style={styles.projectionAmount}>{format(summary.projection.nextMonthCents)}</Text>
          <Text style={styles.projectionCaption}>
            {strings.insights.scanProjectionLockedInCaption(format(summary.projection.lockedInCents))}
          </Text>
        </View>
      )}

      {/* The re-scan offer only exists while the flow does (decision 0009).
          With the scan dormant, /leak-scan redirects to this very tab, so an
          ungated button would be a control that visibly does nothing, and
          "updated when you run a new scan" would be a promise the app cannot
          keep. Both come back with the flag. */}
      <View style={styles.footer}>
        <Text style={styles.footerCaption}>
          {SCAN_FLOW_ENABLED
            ? strings.insights.scanUpdatedCaption
            : strings.insights.scanSavedCaption}
        </Text>
        {SCAN_FLOW_ENABLED ? (
          <Button
            label={strings.insights.scanRerunAction}
            onPress={handleRunNewScan}
            variant="tertiary"
            style={styles.footerAction}
          />
        ) : null}
      </View>
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 2,
    },
    eyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      textTransform: 'uppercase',
      color: theme.mistText,
    },
    evidenceLine: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 4,
    },
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      padding: 18,
    },
    cardTitle: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      marginBottom: 4,
    },
    categoryRow: {
      paddingVertical: 8,
    },
    categoryLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      marginBottom: spacing.xs,
    },
    categoryName: {
      flex: 1,
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.ink,
    },
    categoryAmount: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
    },
    // Spend is not a win: the track is snow and the fill is mist. Never sage.
    barTrack: {
      height: 6,
      borderRadius: radii.micro,
      backgroundColor: theme.snow,
      overflow: 'hidden',
    },
    barFill: {
      height: 6,
      borderRadius: radii.micro,
      backgroundColor: theme.mist,
    },
    leakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.hairlineSubtle,
    },
    leakText: {
      flex: 1,
    },
    leakName: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    leakSummaryLine: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    caption: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 8,
    },
    projectionAmount: {
      fontSize: typeScale.displayMid,
      fontFamily: theme.fonts.display,
      color: theme.ink,
      fontVariant: ['tabular-nums'],
      includeFontPadding: false,
      marginTop: 6,
    },
    projectionCaption: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 6,
      fontVariant: ['tabular-nums'],
    },
    footer: {
      alignItems: 'center',
      paddingTop: 2,
    },
    footerCaption: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.mistText,
      textAlign: 'center',
    },
    footerAction: {
      marginTop: 2,
    },
  });
}
