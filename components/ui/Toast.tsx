/**
 * Toast (spec 01 section 5). Dark ink pill anchored above the tab bar, one at a
 * time, auto-dismissing after 2.5s. Every mutating action fires exactly one via
 * useToast().show(). Implemented as a context provider so any screen under the
 * root can announce without threading props.
 *
 * Motion honors prefers-reduced-motion: the default enter/exit is a 220ms
 * translateY(8)->0 plus fade; under reduced motion it is opacity-only, matching
 * the Direction C rule (utils/motion.ts).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { layout, motion, radii, shadows, typeScale } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';
import { useReducedMotion } from '@/utils/motion';

const DEFAULT_DURATION_MS = 2500;

export type ToastAction = { label: string; onPress: () => void };

export type ToastApi = {
  show: (
    message: string,
    opts?: { action?: ToastAction; durationMs?: number }
  ) => void;
};

type ToastState = {
  message: string;
  action?: ToastAction;
  durationMs: number;
  // Monotonic key so each show() is a distinct instance for animation resets.
  key: number;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/**
 * How far to lift the pill above its usual spot (ADR 0038).
 *
 * The toast sits at tabBarHeight + inset + 24, which since Today grew an
 * ActionDock is behind the dock. A save toast would cover the very field the
 * user might want again. Screens with docked chrome report its height here.
 *
 * A separate context from ToastApi on purpose: ToastApi's value is memoized
 * to one stable identity because ~10 files consume it, and folding a changing
 * number into it would re-render all of them on every layout pass.
 *
 * Single-writer by design: the setter is last-writer-wins, which is fine while
 * Today is the only caller. A second docked screen would need a ref-counted
 * registry here, not a second bare call.
 */
const ToastLiftContext = createContext<(height: number) => void>(() => {});

export function useToastLift(height: number): void {
  const setLift = useContext(ToastLiftContext);
  useEffect(() => {
    setLift(height);
    return () => setLift(0);
  }, [height, setLift]);
}

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [toast, setToast] = useState<ToastState | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextKey = useRef(0);

  const clearTimer = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const show = useCallback<ToastApi['show']>(
    (message, opts) => {
      clearTimer();
      const durationMs = opts?.durationMs ?? DEFAULT_DURATION_MS;
      nextKey.current += 1;
      setToast({ message, action: opts?.action, durationMs, key: nextKey.current });
      AccessibilityInfo.announceForAccessibility(message);
      dismissTimer.current = setTimeout(hide, durationMs);
    },
    [clearTimer, hide]
  );

  useEffect(() => clearTimer, [clearTimer]);

  // `show` is already a stable useCallback, so [show] is the complete dep
  // list: this object only needs to change if `show` itself is ever
  // recreated (it never is, in practice, since its own deps are stable).
  // Without this, every show()/auto-dismiss re-render of ToastProvider (which
  // happens on nearly every mutating action in the app) handed all 10
  // useToast() consumer files a new object identity, re-rendering all of them
  // twice per toast for no reason.
  const value = useMemo(() => ({ show }), [show]);

  const [lift, setLift] = useState(0);

  return (
    <ToastContext.Provider value={value}>
      <ToastLiftContext.Provider value={setLift}>
        {children}
      </ToastLiftContext.Provider>
      <ToastHost toast={toast} onDismiss={hide} lift={lift} />
    </ToastContext.Provider>
  );
}

function ToastHost({
  toast,
  onDismiss,
  lift,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
  /** Height of any docked chrome to clear (ADR 0038). 0 on most screens. */
  lift: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Keep the last toast mounted through the exit animation, then clear it.
  const [rendered, setRendered] = useState<ToastState | null>(toast);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      setRendered(toast);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.toast,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start();
    } else if (rendered) {
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.toast,
        easing: Easing.bezier(...motion.easing),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.key, toast === null]);

  if (!rendered) return null;

  const bottom = layout.tabBarHeight + Math.max(insets.bottom, 8) + lift + 24;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const animatedStyle = reduceMotion
    ? { opacity: progress }
    : { opacity: progress, transform: [{ translateY }] };

  const handleAction = () => {
    const onPress = rendered.action?.onPress;
    onDismiss();
    onPress?.();
  };

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View
        style={[styles.pill, { bottom }, animatedStyle]}
        accessibilityLiveRegion="polite"
        testID="toast-pill"
      >
        <Text style={styles.message} numberOfLines={2} maxFontSizeMultiplier={1.5}>
          {rendered.message}
        </Text>
        {rendered.action ? (
          // UX-031: the pressable's text-only bounds plus hitSlop 8 landed
          // around 33pt effective, short of the 44pt floor, on a control that
          // is only reachable for 2.5s. minWidth on the wrapper covers the
          // horizontal side and hitSlop extends the vertical reach to 44pt,
          // neither of which grows the pill's own layout height (hitSlop
          // never participates in layout; the pill's height still tracks the
          // message text).
          <Pressable
            onPress={handleAction}
            accessibilityRole="button"
            accessibilityLabel={rendered.action.label}
            style={styles.actionHitArea}
            hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
          >
            <Text style={styles.action} numberOfLines={1} maxFontSizeMultiplier={1.5}>
              {rendered.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    host: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    pill: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.toastBg,
      borderRadius: radii.card,
      paddingVertical: 12,
      paddingHorizontal: 18,
      // The longest toast message plus an Undo action can overflow at large
      // Dynamic Type without a width ceiling; the text below is left to
      // shrink inside it rather than pushing the pill off-screen. UX-043.
      maxWidth: '92%',
      ...shadows.toast,
    },
    message: {
      color: theme.white,
      fontSize: typeScale.control,
      fontFamily: theme.fonts.uiSemibold,
      flexShrink: 1,
    },
    // UX-031: minWidth covers the horizontal 44pt floor; the vertical 44pt is
    // reached via hitSlop on the Pressable above instead, since hitSlop does
    // not affect layout and so cannot inflate the pill's height.
    actionHitArea: {
      minWidth: 44,
      marginLeft: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    action: {
      color: theme.toastAction,
      fontSize: typeScale.control,
      fontFamily: theme.fonts.uiBold,
    },
  });
}
