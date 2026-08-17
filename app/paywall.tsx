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
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { radii, typeScale, spacing, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { hapticSelection } from '@/utils/motion';
import { track, isPaywallPlacement } from '@/utils/analytics';
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
  const toast = useToast();
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const params = useLocalSearchParams<{ placement?: string }>();
  const placement = isPaywallPlacement(params.placement) ? params.placement : 'unknown';

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
    // Back to the gated sheet, which re-reads the entitlement on mount.
    router.back();
    if (result.ok) toast.show(strings.toasts.trialStarted);
  };

  const handleRestore = async () => {
    const result = await restore();
    // Mock mode has nothing to restore; surface that plainly and stay put.
    toast.show(
      result.ok && result.entitlement === 'premium'
        ? strings.settings.restoreDoneMessage
        : strings.settings.restoreNoneMessage
    );
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
          // UX-053: was hitSlop 2 (40pt + 2 = exactly 44); the house
          // ScreenHeader pill (components/ui/ScreenHeader.tsx) uses hitSlop
          // 4, matched here.
          hitSlop={4}
        >
          <Icon name="X" size={18} color={theme.slate} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* One of two decorative gradients the app allows; see the list in
            design/PATTERN_VOCABULARY.md "Color" (spec 01 section 1).
            UX-006: full-strength lavender under white text was 3.32:1, below
            AA, and the 11pt eyebrow and 15pt subtitle also carried opacity
            that cut it further. Both stops are now real tokens dark enough to
            hold white text (5.29 and 4.86) and the opacity is gone. */}
        <LinearGradient
          colors={[theme.lavenderDeep, theme.categoryColors.utility]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>{strings.paywall.heroEyebrow}</Text>
          {/* UX-026: this is the paywall's screen title; give it header role
              so it shows up in VoiceOver's rotor. */}
          <Text style={styles.title} accessibilityRole="header">
            {strings.paywall.title}
          </Text>
          <Text style={styles.subtitle}>{strings.paywall.subtitle}</Text>
        </LinearGradient>

        <View style={styles.features}>
          {features.map((line) => (
            <View style={styles.featureRow} key={line}>
              <Icon name="Check" size={18} color={theme.primaryDark} />
              <Text style={styles.featureText}>{line}</Text>
            </View>
          ))}
        </View>

        {/* UX-025: iOS announces radio buttons poorly without a containing
            radiogroup and a `checked` state per card. */}
        <View style={styles.plans} accessibilityRole="radiogroup">
          {plans.map((plan) => {
            const isSelected = plan.id === selected;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => { hapticSelection(); setSelected(plan.id); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={strings.paywall.planSelectedLabel(
                  plan.name,
                  `${plan.price} ${plan.period}${plan.badge ? `, ${plan.badge}` : ''}`,
                  isSelected
                )}
              >
                <View style={styles.planRadioColumn}>
                  <Icon
                    name={isSelected ? 'CircleDot' : 'Circle'}
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
          <Icon name="Info" size={16} color={theme.textSecondary} />
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
        {/* Descriptive dismiss, never "No thanks" (spec 04 paywall). */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleClose}
          accessibilityRole="button"
        >
          <Text style={styles.stayFreeText}>{strings.paywall.stayOnFreePlan}</Text>
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
    // House header-chrome pill (matches ScreenHeader's actionButton /
    // backButton: components/ui/ScreenHeader.tsx), not a hand-rolled control.
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.cloud,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      // UX-018: 24 drifted from the ratified 20pt screen gutter.
      paddingHorizontal: spacing.gutter,
      paddingTop: 4,
    },
    // Gradient hero: white type on lavender-to-indigo. One of the two
    // decorative gradients the app allows (design/PATTERN_VOCABULARY.md "Color").
    // UX-006: both stops are tokens dark enough to carry white text; see the
    // render-side comment for the contrast math.
    hero: {
      borderRadius: radii.feature,
      paddingHorizontal: spacing.gutter,
      paddingVertical: 24,
    },
    heroEyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.white,
      // UX-060: uppercased by the style, not by a JS .toUpperCase() on the
      // string. The string stays sentence case so screen readers speak it as
      // words rather than letters.
      textTransform: 'uppercase',
      // UX-006: the opacity trick lowered effective contrast for no design
      // gain; removed now that the gradient itself clears 4.5:1.
      marginBottom: 8,
    },
    title: {
      fontSize: typeScale.displayMid,
      lineHeight: 36,
      fontFamily: theme.fonts.display,
      color: theme.white,
      includeFontPadding: false,
    },
    subtitle: {
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
      color: theme.white,
      // UX-006: the opacity trick lowered effective contrast for no design
      // gain; removed now that the gradient itself clears 4.5:1.
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
      fontSize: typeScale.body,
      fontFamily: theme.fonts.ui,
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
      borderRadius: radii.card,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.surface,
      minHeight: 64,
    },
    planCardSelected: {
      borderWidth: 1.5,
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
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
      fontSize: typeScale.button,
      fontFamily: theme.fonts.uiBold,
      color: theme.text,
    },
    planBadge: {
      backgroundColor: theme.primary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    // ADR 0027 (2026-08-16, Option A): white on the retuned sage badge is
    // 5.37:1 at 11pt uppercase. UX-001.
    planBadgeText: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiBold,
      color: theme.white,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    planCaption: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      marginTop: 3,
    },
    planPriceColumn: {
      alignItems: 'flex-end',
      marginLeft: 12,
    },
    planPrice: {
      fontSize: typeScale.lead,
      fontFamily: theme.fonts.uiBold,
      fontVariant: ['tabular-nums'],
      color: theme.text,
    },
    planPeriod: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      fontVariant: ['tabular-nums'],
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
      borderRadius: radii.card,
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    plannedBannerText: {
      flex: 1,
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      lineHeight: 17,
    },
    footer: {
      // UX-018: 24 drifted from the ratified 20pt screen gutter.
      paddingHorizontal: spacing.gutter,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    trialLine: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: 18,
    },
    primaryButton: {
      minHeight: 52,
      borderRadius: radii.control,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      fontSize: typeScale.button,
      fontFamily: theme.fonts.uiSemibold,
      // White, matching the shared Button primitive: the retuned sage is
      // 5.37:1. ADR 0027 (2026-08-16, Option A). This is the screen's main
      // CTA, so it cannot be the one that misses. UX-001.
      color: theme.white,
    },
    restoreButton: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    restoreText: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.primary,
    },
    stayFreeText: {
      fontSize: typeScale.label,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.slate,
    },
  });
}
