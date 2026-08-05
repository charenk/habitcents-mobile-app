import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Icon } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useReducedMotion } from '@/utils/motion';
import { radii, shadows, typeScale, type AppTheme } from '@/constants/theme';
import { strings } from '@/constants/strings';

const AUTO_ADVANCE_MS = 4000;
const PAGE_COUNT = 3;
// welcome.tsx's content column carries a 24pt gutter on each side (its
// `content` style). The carousel lives inside that column, so its available
// width is the window width minus both gutters. Deriving it from
// useWindowDimensions rather than an onLayout measurement keeps it
// deterministic under test, where layout events never fire.
const CONTENT_GUTTER = 24;

type OutcomeCardId = 'log' | 'leak' | 'kept';

const CARD_ORDER: OutcomeCardId[] = ['log', 'leak', 'kept'];

function cardLine(id: OutcomeCardId): string {
  switch (id) {
    case 'log':
      return strings.onboarding.valuePropLog;
    case 'leak':
      return strings.onboarding.outcomeSpotLeak;
    case 'kept':
      return strings.onboarding.outcomeKeptCounts;
  }
}

type VignetteProps = { theme: AppTheme; styles: Styles };

/** Card 1: a miniature of the Today quick-log card (app/(tabs)/index.tsx). */
function QuickLogVignette({ theme, styles }: VignetteProps) {
  return (
    <View style={styles.quickLogRow} importantForAccessibility="no">
      <Text style={styles.quickLogAmount} allowFontScaling={false}>
        {strings.onboarding.outcomeLogAmount}
      </Text>
      <View style={styles.quickLogPlus}>
        <Icon name="Plus" size={16} color={theme.white} />
      </View>
    </View>
  );
}

/** Card 2: a miniature of the leak card (components/habit-logging/LeakCard.tsx). */
function LeakVignette({ styles }: VignetteProps) {
  return (
    <View importantForAccessibility="no">
      <Text style={styles.leakMerchant} allowFontScaling={false}>
        {strings.onboarding.outcomeLeakMerchant}
      </Text>
      <Text style={styles.leakEvidence} allowFontScaling={false}>
        {strings.onboarding.outcomeLeakMonthly}
      </Text>
      <View style={styles.leakPill}>
        <Text style={styles.leakPillText} allowFontScaling={false}>
          {strings.habitLogging.breakIt}
        </Text>
      </View>
    </View>
  );
}

/** Card 3: a miniature of the Kept hero band (components/habit-logging/KeptHero.tsx). */
function KeptVignette({ styles }: VignetteProps) {
  return (
    <View style={styles.keptBand} importantForAccessibility="no">
      <Text style={styles.keptEyebrow} allowFontScaling={false}>
        {strings.habitLogging.keptSoFar}
      </Text>
      <Text style={styles.keptAmount} allowFontScaling={false}>
        {strings.onboarding.outcomeKeptAmount}
      </Text>
    </View>
  );
}

const VIGNETTES: Record<OutcomeCardId, (props: VignetteProps) => React.JSX.Element> = {
  log: QuickLogVignette,
  leak: LeakVignette,
  kept: KeptVignette,
};

/**
 * OutcomeCarousel (OB-5, ADR 0020). Replaces welcome.tsx's static three-row
 * value-prop list and the redundant How-it-works sheet with three composed
 * native vignette cards, one per outcome: log, spot the leak, watch kept
 * count up. No bitmaps, they go stale and weigh the bundle, and no new deps:
 * a plain paging ScrollView, per this app's crash history with mixed
 * Animated drivers and gesture-handler/Reanimated in onboarding-adjacent
 * flows.
 *
 * Auto-advance is a plain interval driving ScrollView.scrollTo, not an
 * Animated value, and it permanently stops on first user touch, under
 * reduced motion, and while a screen reader is active. Off-screen pages are
 * hidden from assistive tech so a screen-reader swipe only ever lands on the
 * current card.
 */
export function OutcomeCarousel() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.max(0, windowWidth - CONTENT_GUTTER * 2);
  const reduceMotion = useReducedMotion();
  const [screenReaderOn, setScreenReaderOn] = useState(false);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled?.()
      .then(v => {
        if (mounted) setScreenReaderOn(!!v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('screenReaderChanged', (v: boolean) => {
      if (mounted) setScreenReaderOn(!!v);
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!autoAdvanceEnabled || reduceMotion || screenReaderOn || pageWidth === 0) return;
    const id = setInterval(() => {
      const next = (pageRef.current + 1) % PAGE_COUNT;
      pageRef.current = next;
      setPage(next);
      scrollRef.current?.scrollTo({ x: next * pageWidth, animated: true });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [autoAdvanceEnabled, reduceMotion, screenReaderOn, pageWidth]);

  const handleScrollBeginDrag = () => {
    // First user touch pauses auto-advance for good; it never resumes.
    setAutoAdvanceEnabled(false);
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth === 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, next));
    pageRef.current = clamped;
    setPage(clamped);
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        testID="outcome-carousel-scroll"
      >
        {CARD_ORDER.map((id, i) => {
          const Vignette = VIGNETTES[id];
          const line = cardLine(id);
          const isCurrent = i === page;
          return (
            <View
              key={id}
              style={{ width: pageWidth }}
              // A pager with every page mounted at once must hide the pages
              // that are not currently on screen from assistive tech
              // (PATTERN_VOCABULARY, "Anything mounted off-screen (pagers)
              // is hidden from assistive tech").
              accessibilityElementsHidden={!isCurrent}
              importantForAccessibility={isCurrent ? 'yes' : 'no-hide-descendants'}
            >
              <View
                style={styles.card}
                accessible
                accessibilityRole="text"
                accessibilityLabel={line}
              >
                <Vignette theme={theme} styles={styles} />
                <Text style={styles.cardLine} importantForAccessibility="no">
                  {line}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.dots} importantForAccessibility="no">
        {CARD_ORDER.map((id, i) => (
          <View key={id} testID={`outcome-dot-${i}`} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.white,
      borderRadius: radii.feature,
      borderWidth: 1,
      borderColor: theme.cloud,
      paddingVertical: 16,
      paddingHorizontal: 18,
      minHeight: 128,
      justifyContent: 'space-between',
      ...shadows.card,
    },
    cardLine: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      marginTop: 12,
      lineHeight: 19,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.cloud,
    },
    dotActive: {
      backgroundColor: theme.primary,
    },
    // Quick-log vignette
    quickLogRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    quickLogAmount: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.mist,
    },
    quickLogPlus: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Leak vignette
    leakMerchant: {
      fontSize: 16,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.ink,
    },
    leakEvidence: {
      fontSize: typeScale.secondary,
      fontFamily: theme.fonts.ui,
      color: theme.slate,
      fontVariant: ['tabular-nums'],
      marginTop: 4,
    },
    leakPill: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primary,
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 10,
    },
    leakPillText: {
      fontSize: typeScale.caption,
      fontFamily: theme.fonts.uiSemibold,
      color: theme.white,
    },
    // Kept vignette
    keptBand: {
      backgroundColor: theme.primaryLight,
      borderRadius: radii.control,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    keptEyebrow: {
      fontSize: typeScale.eyebrow,
      fontFamily: theme.fonts.uiSemibold,
      letterSpacing: typeScale.eyebrowLetterSpacing,
      color: theme.primaryDark,
    },
    keptAmount: {
      fontSize: typeScale.statCard,
      fontFamily: theme.fonts.display,
      fontVariant: ['tabular-nums'],
      color: theme.primaryDark,
      marginTop: 2,
    },
  });
}

type Styles = ReturnType<typeof createStyles>;
