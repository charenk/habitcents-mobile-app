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
import { motion, shadows } from '@/constants/theme';
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

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastHost toast={toast} onDismiss={hide} />
    </ToastContext.Provider>
  );
}

function ToastHost({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
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

  const bottom = 56 + Math.max(insets.bottom, 8) + 24;
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
      >
        <Text style={styles.message}>{rendered.message}</Text>
        {rendered.action ? (
          <Pressable
            onPress={handleAction}
            accessibilityRole="button"
            accessibilityLabel={rendered.action.label}
            hitSlop={8}
          >
            <Text style={styles.action}>{rendered.action.label}</Text>
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
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 18,
      ...shadows.toast,
    },
    message: {
      color: theme.white,
      fontSize: 13.5,
      fontFamily: theme.fonts.uiSemibold,
    },
    action: {
      color: theme.toastAction,
      fontSize: 13.5,
      fontFamily: theme.fonts.uiBold,
      marginLeft: 14,
    },
  });
}
