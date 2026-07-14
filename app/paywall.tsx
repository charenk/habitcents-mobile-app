/**
 * Paywall (BET-004, Phase 3 monetization). First-pass, MOCK MODE.
 *
 * ---------------------------------------------------------------------------
 * v1, NEEDS DESIGN REVIEW. Prices are PLANNED and pending Charen's design and
 * final pricing decision (Phase 3). Nothing is charged: purchases run through
 * utils/purchases.ts in mock mode until the RevenueCat key lands. Treat the
 * layout, copy, and price framing here as a working placeholder, not final.
 * ---------------------------------------------------------------------------
 *
 * Presented as a modal route (app/_layout.tsx: presentation 'modal'). Opened
 * from the pick-one sheet's trial CTA (habit gate) and from onboarding success.
 * The placement query param flows into the paywall_* analytics events.
 *
 * Analytics wired here: paywall_shown (on mount), paywall_dismissed (on any
 * exit that is not a completed purchase), trial_started (CTA tap),
 * purchase_completed (mock purchase resolves ok).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { track } from '@/utils/analytics';
import {
  purchase,
  restore,
  PRODUCT_MONTHLY,
  PRODUCT_ANNUAL,
  PRODUCT_LIFETIME,
  type ProductId,
} from '@/utils/purchases';

type PlanRow = {
  id: ProductId;
  name: string;
  price: string;
  period: string;
  caption?: string;
  badge?: string;
};

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const params = useLocalSearchParams<{ placement?: string }>();
  const placement = params.placement ?? 'unknown';

  // Annual is the default, highlighted choice (annual-first pricing).
  const [selected, setSelected] = useState<ProductId>(PRODUCT_ANNUAL);
  const [purchasing, setPurchasing] = useState(false);

  // Default exit is a dismissal; a completed purchase flips this so the cleanup
  // does not also fire paywall_dismissed. Covers the close button, swipe-down,
  // and hardware back in one place.
  const outcome = useRef<'dismissed' | 'purchased'>('dismissed');

  useEffect(() => {
    track('paywall_shown', { placement });
    return () => {
      if (outcome.current === 'dismissed') {
        track('paywall_dismissed', { placement });
      }
    };
  }, [placement]);

  const plans: PlanRow[] = [
    {
      id: PRODUCT_ANNUAL,
      name: strings.paywall.planYearlyName,
      price: strings.paywall.planYearlyPrice,
      period: strings.paywall.planYearlyPeriod,
      caption: strings.paywall.planYearlyCaption,
      badge: strings.paywall.planYearlyBadge,
    },
    {
      id: PRODUCT_MONTHLY,
      name: strings.paywall.planMonthlyName,
      price: strings.paywall.planMonthlyPrice,
      period: strings.paywall.planMonthlyPeriod,
    },
    {
      id: PRODUCT_LIFETIME,
      name: strings.paywall.planLifetimeName,
      price: strings.paywall.planLifetimePrice,
      period: strings.paywall.planLifetimePeriod,
      caption: strings.paywall.planLifetimeCaption,
    },
  ];

  const handleClose = () => {
    router.back();
  };

  const handleStartTrial = async () => {
    if (purchasing) return;
    setPurchasing(true);
    // Trial start, then the (mock) purchase; both events fire so the funnel is
    // wired before real purchases exist.
    track('trial_started', { product: selected });
    const result = await purchase(selected);
    if (result.ok) {
      track('purchase_completed', { product: selected });
      outcome.current = 'purchased';
    }
    setPurchasing(false);
    router.back();
  };

  const handleRestore = async () => {
    const result = await restore();
    // Mock mode has nothing to restore; surface that plainly and stay put.
    const message =
      result.ok && result.entitlement === 'premium'
        ? strings.settings.restoreDoneMessage
        : strings.settings.restoreNoneMessage;
    Alert.alert(strings.settings.restoreAlertTitle, message);
  };

  const features = [strings.paywall.feature1, strings.paywall.feature2, strings.paywall.feature3];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={strings.paywall.closeLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{strings.paywall.title}</Text>
        <Text style={styles.subtitle}>{strings.paywall.subtitle}</Text>

        <View style={styles.features}>
          {features.map((line) => (
            <View style={styles.featureRow} key={line}>
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              <Text style={styles.featureText}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {plans.map((plan) => {
            const isSelected = plan.id === selected;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setSelected(plan.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${plan.name}, ${plan.price} ${plan.period}${plan.badge ? `, ${plan.badge}` : ''}`}
              >
                <View style={styles.planRadioColumn}>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isSelected ? theme.primary : theme.border}
                  />
                </View>
                <View style={styles.planBody}>
                  <View style={styles.planNameRow}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.badge && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                  </View>
                  {plan.caption && <Text style={styles.planCaption}>{plan.caption}</Text>}
                </View>
                <View style={styles.planPriceColumn}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.plannedBanner}>
          <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.plannedBannerText}>{strings.paywall.plannedBanner}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.trialLine}>{strings.paywall.trialLine}</Text>
        <TouchableOpacity
          style={[styles.primaryButton, purchasing && styles.primaryButtonDisabled]}
          onPress={handleStartTrial}
          disabled={purchasing}
          accessibilityRole="button"
          accessibilityState={{ disabled: purchasing }}
        >
          <Text style={styles.primaryButtonText}>{strings.paywall.startTrialCta}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          accessibilityRole="button"
        >
          <Text style={styles.restoreText}>{strings.paywall.restoreCta}</Text>
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
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 4,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.text,
      lineHeight: 32,
    },
    subtitle: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 21,
      marginTop: 8,
    },
    features: {
      marginTop: 24,
      gap: 12,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    featureText: {
      fontSize: 15,
      color: theme.text,
      flex: 1,
    },
    plans: {
      marginTop: 28,
      gap: 12,
    },
    planCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.surface,
      minHeight: 64,
    },
    planCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.iconBgGreen,
    },
    planRadioColumn: {
      marginRight: 12,
    },
    planBody: {
      flex: 1,
    },
    planNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    planName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    planBadge: {
      backgroundColor: theme.primary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    planBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.white,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    planCaption: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 3,
    },
    planPriceColumn: {
      alignItems: 'flex-end',
      marginLeft: 12,
    },
    planPrice: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    planPeriod: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    plannedBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 20,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    plannedBannerText: {
      flex: 1,
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 17,
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    trialLine: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: 18,
    },
    primaryButton: {
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.white,
    },
    restoreButton: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    restoreText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
  });
}
